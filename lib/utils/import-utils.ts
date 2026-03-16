export const readFileContent = async (file: File): Promise<{ headers: string[], data: Record<string, string>[] }> => {
    let headers: string[] = [];
    let data: Record<string, string>[] = [];

    if (file.name.endsWith('.csv')) {
        // Parse CSV file
        const text = await file.text();
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);

        if (lines.length < 1) {
            throw new Error("File appears to be empty");
        }

        headers = lines[0].split(',').map(h => h.trim());
        data = lines.slice(1).map((line) => {
            const values = line.split(',').map(v => v.trim());
            const row: Record<string, string> = {};
            headers.forEach((header, i) => {
                row[header] = values[i] || "";
            });
            return row;
        });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parse Excel file
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length < 1) {
            throw new Error("File appears to be empty");
        }

        data = (jsonData.slice(1) as string[][]).map((row) => {
            const rowData: Record<string, string> = {};
            headers.forEach((header, i) => {
                rowData[header] = String(row[i] || "").trim();
            });
            return rowData;
        }).filter(row => Object.keys(row).length > 0); // Filter empty rows
    } else {
        throw new Error("Unsupported file format. Please use CSV or Excel files.");
    }

    return { headers, data };
};
