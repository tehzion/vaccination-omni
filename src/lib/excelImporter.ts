import * as XLSX from 'xlsx';
import { CheckIn } from './db';
import { generateUUID } from './utils';

export interface ImportResult {
    success: CheckIn[];
    skipped: { row: number; reason: string; data: any }[];
    errors: { row: number; message: string; data: any }[];
}

export interface ImportOptions {
    projectId?: number;
    existingMyKads: Set<string>;
}

/**
 * Parse Excel file and return structured patient data
 */
export async function importPatientsFromExcel(
    file: File,
    options: ImportOptions = { existingMyKads: new Set() }
): Promise<ImportResult> {
    const result: ImportResult = {
        success: [],
        skipped: [],
        errors: []
    };

    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(firstSheet);

        const today = new Date();
        const datePrefix = today.toISOString().split('T')[0].replace(/-/g, '');

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2; // Excel row (header is row 1)

            try {
                // Required fields validation
                const fullName = row['Full Name']?.toString().trim();
                const mykad = row['IC/MyKad']?.toString().trim();

                if (!fullName || !mykad) {
                    result.errors.push({
                        row: rowNumber,
                        message: 'Missing required fields (Full Name or IC/MyKad)',
                        data: row
                    });
                    continue;
                }

                // Check for duplicates
                if (options.existingMyKads.has(mykad)) {
                    result.skipped.push({
                        row: rowNumber,
                        reason: 'Duplicate IC/MyKad already exists in system',
                        data: row
                    });
                    continue;
                }

                // Optional fields
                const phone = row['Phone']?.toString().trim() || '';
                const email = row['Email']?.toString().trim() || '';
                const language = row['Language']?.toString().toLowerCase() === 'bm' ? 'bm' : 'en';

                // Generate patient record
                const patientId = generateUUID();
                const queueNumber = `${datePrefix}-${String(result.success.length + 1).padStart(3, '0')}`;

                const patient: CheckIn = {
                    id: patientId,
                    projectId: options.projectId,
                    fullName,
                    mykad,
                    phone: phone || undefined,
                    email: email || undefined,
                    queueNumber,
                    status: 'waiting',
                    language,
                    timestamp: Date.now(),
                    dose: 1
                };

                result.success.push(patient);
                options.existingMyKads.add(mykad); // Track to prevent duplicates within the same file

            } catch (error: any) {
                result.errors.push({
                    row: rowNumber,
                    message: error.message || 'Unknown error',
                    data: row
                });
            }
        }

    } catch (error: any) {
        result.errors.push({
            row: 0,
            message: `Failed to read Excel file: ${error.message}`,
            data: null
        });
    }

    return result;
}

/**
 * Generate a blank Excel template for download
 */
export function generateExcelTemplate(): Blob {
    const template = [
        {
            'Full Name': 'John Doe',
            'IC/MyKad': '123456-78-9012',
            'Phone': '0123456789',
            'Email': 'john@example.com',
            'Language': 'en'
        },
        {
            'Full Name': 'Ahmad bin Ali',
            'IC/MyKad': '987654-32-1098',
            'Phone': '0198765432',
            'Email': 'ahmad@example.com',
            'Language': 'bm'
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients');

    // Set column widths
    worksheet['!cols'] = [
        { wch: 20 }, // Full Name
        { wch: 15 }, // IC/MyKad
        { wch: 12 }, // Phone
        { wch: 25 }, // Email
        { wch: 10 }  // Language
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
