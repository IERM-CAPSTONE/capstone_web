import React, { useMemo, useState } from 'react';
import { SeatGrid, Seat, searchSeats } from '@/lib/utils/seat-map';
import clsx from 'clsx';

type Props = {
    seatGrid: SeatGrid;
    highlightStudentId?: string;
    onSeatClick?: (seat: Seat) => void;
    className?: string;
};

const SeatMapComponent: React.FC<Props> = ({ seatGrid, highlightStudentId, onSeatClick, className }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const matches = useMemo(() => searchSeats(seatGrid, searchTerm), [seatGrid, searchTerm]);
    const matchIds = useMemo(() => new Set(matches.map((m) => m.seatId)), [matches]);

    return (
        <div className={clsx('space-y-4', className)}>
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold">Seat Map</div>
                    <div className="text-sm text-gray-600">Room {seatGrid.room.roomNumber ?? seatGrid.room.id}</div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span>Total: {seatGrid.stats.totalSeats}</span>
                    <span>Occupied: {seatGrid.stats.occupied}</span>
                    <span>Available: {seatGrid.stats.available}</span>
                    <span>Filled: {seatGrid.stats.percentOccupied}%</span>
                </div>
            </header>

            <div className="flex flex-wrap items-center gap-3">
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, code, or seat"
                    className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Legend color="bg-green-500" label="Available" />
                    <Legend color="bg-red-500" label="Occupied" />
                    <Legend color="bg-blue-500" label="Match" />
                    <Legend color="bg-purple-500" label="Highlighted" />
                </div>
            </div>

            <div className="overflow-auto rounded-md border border-gray-200 p-3">
                <div
                    className="grid gap-2"
                    style={{
                        gridTemplateColumns: `repeat(${seatGrid.room.max_columns}, minmax(48px, 1fr))`,
                    }}
                >
                    {seatGrid.seats.flat().map((seat) => {
                        const isHighlight = highlightStudentId && seat.studentId === highlightStudentId;
                        const isSearchMatch = matchIds.has(seat.seatId);
                        const color = seat.isOccupied
                            ? isHighlight
                                ? 'bg-purple-500 text-white'
                                : isSearchMatch
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-red-500 text-white'
                            : isSearchMatch
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800';
                        return (
                            <button
                                key={seat.seatId}
                                onClick={() => onSeatClick?.(seat)}
                                className={clsx(
                                    'h-12 rounded border border-gray-200 text-xs font-medium shadow-sm transition',
                                    color,
                                    seat.isOccupied && !isHighlight && 'hover:brightness-95',
                                    !seat.isOccupied && 'hover:border-gray-300'
                                )}
                                title={seat.studentName || seat.studentCode || seat.seatId}
                            >
                                <div className="text-[10px] opacity-80">{seat.seatId}</div>
                                {seat.isOccupied ? (
                                    <div className="truncate text-[11px] font-semibold">
                                        {seat.studentName || seat.studentCode || 'Assigned'}
                                    </div>
                                ) : (
                                    <div className="text-[11px]">Available</div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const Legend = ({ color, label }: { color: string; label: string }) => (
    <span className="inline-flex items-center gap-1">
        <span className={clsx('h-3 w-3 rounded-sm', color)} />
        <span>{label}</span>
    </span>
);

export default SeatMapComponent;
