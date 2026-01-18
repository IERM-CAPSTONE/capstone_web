
// Parse date strings as local time (avoid timezone conversion)
export const parseLocalDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    // If it's an ISO string with timezone, extract local components
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (isoMatch) {
        // Create date using local time components (no timezone conversion)
        return new Date(
            parseInt(isoMatch[1]),
            parseInt(isoMatch[2]) - 1,
            parseInt(isoMatch[3]),
            parseInt(isoMatch[4]),
            parseInt(isoMatch[5]),
            parseInt(isoMatch[6])
        );
    }
    return new Date(dateStr);
};

// Helper function to extract all exam parts from format like "(S:...)(L:...)(R:...)" -> "S, L, R"
export const extractExamPart = (value: string): string => {
    if (!value) return "";
    const matches = value.match(/\(([A-Z]+):/g);
    if (!matches) return "";
    const parts = matches.map(m => m.replace(/[\(\:]/g, ''));
    return parts.join(', ');
};

export const readFileContent = async (file: File): Promise<{ headers: string[], data: any[] }> => {
    let headers: string[] = [];
    let data: any[] = [];

    if (file.name.endsWith('.csv')) {
        // Parse CSV file
        const text = await file.text();
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);

        if (lines.length < 2) {
            throw new Error("File appears to be empty");
        }

        headers = lines[0].split(',').map(h => h.trim());
        data = lines.slice(1).map((line) => {
            const values = line.split(',').map(v => v.trim());
            const row: any = {};
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

        if (jsonData.length < 2) {
            throw new Error("File appears to be empty");
        }

        headers = (jsonData[0] as any[]).map(h => String(h || "").trim());
        data = (jsonData.slice(1) as any[][]).map((row) => {
            const rowData: any = {};
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

const hasHeader = (headers: string[], keys: string[]) => {
    return keys.some(key => headers.some(h => h.toLowerCase() === key.toLowerCase()));
};

const findValue = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row);
    for (const k of keys) {
        const found = rowKeys.find(rk => rk.toLowerCase() === k.toLowerCase());
        if (found) return row[found];
    }
    return "";
};

export const processImportData = (headers: string[], data: any[]) => {
    // Check format types based on headers (case-insensitive)
    const isScheduleInfo = hasHeader(headers, ["Ca thi", "Mã SV", "Ma SV", "Student Code"]);
    const isProctorInfo = hasHeader(headers, ["ProctorEmail"]);
    const isExamCodeInfo = hasHeader(headers, ["Exam Code", "Mã đề", "Ma de"]);

    if (isScheduleInfo) {
        // Extract unique exam schedules from "Ca thi" column
        const examScheduleMap = new Map<string, any>();
        const sessionPartsMap = new Map<string, Set<string>>();

        data.forEach((row) => {
            const caThi = findValue(row, ["Ca thi", "Exam Session"]);
            const monThi = findValue(row, ["Môn thi", "Subject Code", "Subject"]);
            const examPartRecord = extractExamPart(findValue(row, ["Nộp bài phần thi", "Phần thi", "Phan thi", "ExamPart", "Exam Part"]));

            if (caThi) {
                // Collect exam parts for this session
                if (!sessionPartsMap.has(caThi)) {
                    sessionPartsMap.set(caThi, new Set());
                }
                if (examPartRecord) {
                    examPartRecord.split(',').forEach(p => {
                        const trimmed = p.trim();
                        if (trimmed) sessionPartsMap.get(caThi)?.add(trimmed);
                    });
                }

                if (!examScheduleMap.has(caThi)) {
                    // Parse ca thi format
                    const match = caThi.match(
                        /^(\d{2}\/\d{2}\/\d{4})[\s\.]+(\d+h\d+)-(\d+h\d+)[\s\.]+(.+)$/
                    );
                    if (match) {
                        const [, date, startTime, endTime, room] = match;
                        examScheduleMap.set(caThi, {
                            examCode: "",
                            subjectCode: monThi,
                            examDate: date,
                            startTime: startTime,
                            endTime: endTime,
                            room: room.trim(),
                            examSession: caThi,
                        });
                    }
                }
            }
        });

        // Add aggregated parts to schedules
        const schedules = Array.from(examScheduleMap.values()).map(s => {
            const parts = sessionPartsMap.get(s.examSession);
            return {
                ...s,
                examType: parts ? Array.from(parts).join(', ') : ""
            };
        });

        // Extract student information
        const students = data.map((row) => {
            const memberCode = findValue(row, ["MemberCode", "Member Code"]);
            const sttVal = findValue(row, ["STT"]);
            return {
                stt: (sttVal !== "" && sttVal !== null && sttVal !== undefined) ? parseInt(String(sttVal), 10) : null,
                studentCode: findValue(row, ["Mã SV", "Student Code", "Ma SV"]),
                username: memberCode,
                memberCode: memberCode,
                name: findValue(row, ["Họ tên", "Name", "Student Name", "Ho ten"]),
                email: (findValue(row, ["Email"]) || (memberCode ? `${memberCode}@fpt.edu.vn` : "")),
                examSession: findValue(row, ["Ca thi", "Exam Session"]),
                subjectCode: findValue(row, ["Môn thi", "Subject Code", "Mon thi"]),
                examPart: extractExamPart(findValue(row, ["Nộp bài phần thi", "Phần thi", "Phan thi", "ExamPart", "Exam Part"])),
            };
        });

        return {
            type: "schedule",
            schedules: schedules,
            students: students,
        };
    } else if (isProctorInfo) {
        // Process Proctor Import
        const proctors = data.map((row, idx) => {
            const dateExam = findValue(row, ["DateExam"]);
            const timeExam = findValue(row, ["TimeExam"]);
            const examRoom = findValue(row, ["ExamRoom"]);
            const proctorEmail = findValue(row, ["ProctorEmail"]);

            return {
                dateExam: dateExam,
                timeExam: timeExam,
                examRoom: examRoom,
                proctorEmail: String(proctorEmail ? `${proctorEmail}` : ""),
                proctorType: "Proctor", // Default
            };
        });

        return {
            type: "proctor",
            proctors: proctors
        };
    } else if (isExamCodeInfo) {
        // Process Exam Code Import
        // Headers: Subject Name, Start Date, End Date, Exam Code, Rooms
        const codes: any[] = [];

        data.forEach((row: any) => {
            const startDateStr = findValue(row, ["Start Date"]);
            const endDateStr = findValue(row, ["End Date"]);
            const roomStr = findValue(row, ["Rooms"]);
            const codeStr = findValue(row, ["Exam Code"]);
            const subjectName = findValue(row, ["Subject Name"]);

            if (!startDateStr || !endDateStr || !roomStr) return;

            // Parse Date & Time
            // Format in file: "30/12/2025 13:15"
            const [datePart, startTimePart] = startDateStr.split(" ");
            const [, endTimePart] = endDateStr.split(" ");

            if (!datePart || !startTimePart || !endTimePart) return;

            // Convert times to HHhMM format (13:15 -> 13h15)
            const formatTime = (t: string) => t.replace(":", "h");
            const startTime = formatTime(startTimePart);
            const endTime = formatTime(endTimePart);

            // Parse Code & Open Code
            // Format: "ENT503_L_12345 (123)"
            let examCode = codeStr;
            let openCode = null;

            const openCodeMatch = codeStr ? codeStr.match(/(.*)\s+\((.*)\)$/) : null;
            if (openCodeMatch) {
                examCode = openCodeMatch[1].trim();
                openCode = openCodeMatch[2].trim();
            }

            // Split Rooms by semicolon
            const rooms = roomStr.split(";").map((r: string) => r.trim()).filter((r: string) => r);

            // Generate one entry per room for precise matching
            rooms.forEach((room: string) => {
                const examSession = `${datePart} ${startTime}-${endTime} ${room}`;
                codes.push({
                    subjectName,
                    startDate: startDateStr,
                    endDate: endDateStr,
                    examCode,
                    openCode,
                    room,
                    // Hide examSession from UI later, but keep in data
                    examSession
                });
            });
        });

        return { type: "examcode", codes };
    } else {
        // Fallback/Unknown
        return {
            type: "unknown",
            data: data
        };
    }
};