// Seat map utilities for transforming backend seat assignments into a 2D grid
// Assumes backend returns studentExams with seatNumber (1-indexed) and student info

export type ExamRoom = {
    id: string;
    roomNumber?: string | null;
    max_rows: number;
    max_columns: number;
    total_seats: number;
};

export type StudentExamWithStudent = {
    id: string;
    seatNumber: number | null;
    student?: {
        id: string;
        fullName?: string | null;
        code?: string | null;
    } | null;
};

export type Seat = {
    seatId: string; // e.g., R1C1
    seatNumber: number;
    row: number;
    column: number;
    isOccupied: boolean;
    studentId?: string;
    studentName?: string | null;
    studentCode?: string | null;
};

export type SeatGrid = {
    seats: Seat[][];
    stats: {
        totalSeats: number;
        occupied: number;
        available: number;
        percentOccupied: number;
    };
    room: ExamRoom;
};

function seatNumberToCoords(seatNumber: number, maxColumns: number): { row: number; column: number } {
    const row = Math.floor((seatNumber - 1) / maxColumns) + 1;
    const column = ((seatNumber - 1) % maxColumns) + 1;
    return { row, column };
}

function seatCoordsToId(row: number, column: number): string {
    return `R${row}C${column}`;
}

export function generateSeatMap(
    studentExams: StudentExamWithStudent[],
    room: ExamRoom
): SeatGrid {
    const rows = room.max_rows ?? 0;
    const cols = room.max_columns ?? 0;
    const totalSeats = room.total_seats ?? rows * cols;

    const seatLookup = new Map<number, StudentExamWithStudent>();
    for (const se of studentExams) {
        if (se.seatNumber && se.seatNumber > 0) {
            seatLookup.set(se.seatNumber, se);
        }
    }

    const seats: Seat[][] = [];
    let occupied = 0;

    for (let r = 1; r <= rows; r++) {
        const row: Seat[] = [];
        for (let c = 1; c <= cols; c++) {
            const seatNumber = (r - 1) * cols + c;
            if (seatNumber > totalSeats) break;
            const hit = seatLookup.get(seatNumber);
            const seat: Seat = {
                seatId: seatCoordsToId(r, c),
                seatNumber,
                row: r,
                column: c,
                isOccupied: Boolean(hit),
                studentId: hit?.student?.id ?? undefined,
                studentName: hit?.student?.fullName ?? null,
                studentCode: hit?.student?.code ?? null,
            };
            if (seat.isOccupied) occupied += 1;
            row.push(seat);
        }
        seats.push(row);
    }

    const available = totalSeats - occupied;
    const stats = {
        totalSeats,
        occupied,
        available,
        percentOccupied: totalSeats > 0 ? Math.round((occupied / totalSeats) * 100) : 0,
    };

    return { seats, stats, room };
}

export function flattenSeatGrid(grid: SeatGrid): Seat[] {
    return grid.seats.flat();
}

export function getOccupiedSeats(grid: SeatGrid): Seat[] {
    return flattenSeatGrid(grid).filter((s) => s.isOccupied);
}

export function getAvailableSeats(grid: SeatGrid): Seat[] {
    return flattenSeatGrid(grid).filter((s) => !s.isOccupied);
}

export function findStudentSeat(grid: SeatGrid, studentId: string): Seat | undefined {
    return flattenSeatGrid(grid).find((s) => s.studentId === studentId);
}

export function searchSeats(grid: SeatGrid, term: string): Seat[] {
    const needle = term.trim().toLowerCase();
    if (!needle) return [];
    return flattenSeatGrid(grid).filter((s) => {
        return (
            s.seatId.toLowerCase().includes(needle) ||
            (s.studentName && s.studentName.toLowerCase().includes(needle)) ||
            (s.studentCode && s.studentCode.toLowerCase().includes(needle))
        );
    });
}

export function exportSeatGridAsJSON(grid: SeatGrid): string {
    return JSON.stringify({
        room: grid.room,
        stats: grid.stats,
        seats: flattenSeatGrid(grid),
    });
}

export function exportSeatGridAsCSV(grid: SeatGrid): string {
    const header = ['seatId', 'seatNumber', 'row', 'column', 'isOccupied', 'studentId', 'studentName', 'studentCode'];
    const lines = [header.join(',')];
    for (const seat of flattenSeatGrid(grid)) {
        lines.push([
            seat.seatId,
            seat.seatNumber,
            seat.row,
            seat.column,
            seat.isOccupied,
            seat.studentId ?? '',
            seat.studentName ?? '',
            seat.studentCode ?? '',
        ].join(','));
    }
    return lines.join('\n');
}
