import { db } from '@/lib/db';

export async function exportAllData() {
    try {
        const projects = await db.projects.toArray();
        const checkins = await db.checkins.toArray();
        const settings = await db.settings.toArray();
        const templates = await db.templates.toArray();
        const inventory = await db.inventory.toArray();
        const invoices = await db.invoices.toArray();
        const clientAccounts = await db.clientAccounts.toArray();

        const exportData = {
            timestamp: new Date().toISOString(),
            version: 1,
            data: {
                projects,
                checkins,
                settings,
                templates,
                inventory,
                invoices,
                clientAccounts
            }
        };

        return exportData;
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
}

export function downloadJSON(data: any, filename: string = 'vaccine_db_export.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
