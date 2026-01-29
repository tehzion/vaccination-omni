import * as XLSX from 'xlsx';
import type { CheckIn } from './db';

export function exportPatientListToExcel(
    patients: CheckIn[],
    projectName: string,
    filterType: 'all' | 'vaccinated' | 'pending' = 'all'
): boolean {
    try {
        // Filter patients based on filter type
        let filteredPatients = patients;
        if (filterType === 'vaccinated') {
            filteredPatients = patients.filter(p => p.status === 'completed');
        } else if (filterType === 'pending') {
            filteredPatients = patients.filter(p => p.status !== 'completed');
        }

        // Check if there are patients to export
        if (filteredPatients.length === 0) {
            console.warn('No patients to export');
            return false;
        }

        // Prepare data for export
        const exportData = filteredPatients.map(patient => ({
            'Queue Number': patient.queueNumber,
            'Full Name': patient.fullName,
            'IC/MyKad': patient.mykad,
            'Phone': patient.phone || '-',
            'Email': patient.email || '-',
            'Status': patient.status === 'completed' ? 'Vaccinated' :
                patient.status === 'in_progress' ? 'In Progress' : 'Waiting',
            'Vaccine': patient.vaccineName || '-',
            'Batch': patient.batch || '-',
            'Dose': patient.dose,
            'Administered At': patient.administeredAt
                ? new Date(patient.administeredAt).toLocaleString()
                : '-',
            'Certificate ID': patient.certificateId || '-',
            'Vaccinator': patient.vaccinator || '-'
        }));

        // Create workbook
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Set column widths
        worksheet['!cols'] = [
            { width: 15 }, // Queue Number
            { width: 25 }, // Full Name
            { width: 15 }, // IC/MyKad
            { width: 15 }, // Phone
            { width: 25 }, // Email
            { width: 12 }, // Status
            { width: 20 }, // Vaccine
            { width: 15 }, // Batch
            { width: 8 },  // Dose
            { width: 20 }, // Administered At
            { width: 15 }, // Certificate ID
            { width: 20 }  // Vaccinator
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Patient List');

        // Generate filename
        const filterSuffix = filterType === 'all' ? 'All' :
            filterType === 'vaccinated' ? 'Vaccinated' : 'Pending';
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `${projectName.replace(/\s+/g, '_')}_${filterSuffix}_${timestamp}.xlsx`;

        // Download
        XLSX.writeFile(workbook, filename);

        return true;
    } catch (error) {
        console.error('Excel export failed:', error);
        return false;
    }
}
