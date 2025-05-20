import React from 'react';
import { format } from 'date-fns';

const Calendar = ({ 
    currentDate, 
    vehicleData, 
    statusData, 
    durationData, 
    onStatusClick,
    onNavigateMonth,
    onNavigateToday 
}) => {
    const renderCalendarHeader = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        return (
            <div className="calendar-header">
                <div className="month-navigation">
                    <button onClick={() => onNavigateMonth(-1)}>Previous</button>
                    <h2>{format(currentDate, 'MMMM yyyy')}</h2>
                    <button onClick={() => onNavigateMonth(1)}>Next</button>
                    <button onClick={onNavigateToday}>Today</button>
                </div>
                <div className="date-header">
                    <th className="vehicle-header">Vehicle</th>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                        const date = new Date(year, month, i + 1);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const isToday = date.toDateString() === new Date().toDateString();
                        
                        return (
                            <th 
                                key={i} 
                                className={`date-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
                                data-date={format(date, 'yyyy-MM-dd')}
                            >
                                {i + 1}
                                <br />
                                <small>{format(date, 'EEE')}</small>
                            </th>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderCalendarBody = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        if (!Array.isArray(vehicleData) || vehicleData.length === 0) {
            return (
                <tr>
                    <td colSpan={daysInMonth + 1} className="empty-message">
                        No vehicles available. Please add a vehicle first.
                    </td>
                </tr>
            );
        }

        return vehicleData.map(vehicle => (
            <tr key={vehicle.id}>
                <td className="vehicle-cell" data-vehicle-id={vehicle.id}>
                    {`${vehicle.brand} ${vehicle.model} (${vehicle.plate_number})`}
                </td>
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const date = new Date(year, month, i + 1);
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const status = getStatusForCell(vehicle.id, dateStr);
                    
                    return (
                        <td
                            key={i}
                            className={`status-cell ${status.class}`}
                            data-vehicle-id={vehicle.id}
                            data-date={dateStr}
                            data-editable={status.editable}
                            onClick={() => onStatusClick(vehicle.id, dateStr)}
                        >
                            {status.content}
                        </td>
                    );
                })}
            </tr>
        ));
    };

    const getStatusForCell = (vehicleId, dateStr) => {
        const key = `${vehicleId}-${dateStr}`;
        const status = statusData[key];
        const duration = durationData[key];

        if (!status && !duration) {
            return { class: 'available', editable: true, content: '' };
        }

        if (duration) {
            const isFirstDay = duration.start_date === dateStr;
            const isMaintenance = duration.is_maintenance;
            const isReservation = duration.is_reservation;
            
            let statusClass = isMaintenance ? 'maintenance' : isReservation ? 'reserved' : 'rented';
            let statusText = isMaintenance ? 'MAINTENANCE' : isReservation ? 'RESERVED' : 'RENTED';
            
            return {
                class: statusClass,
                editable: isFirstDay,
                content: isFirstDay ? (
                    <div className="status-indicator">
                        {statusText}
                        {status?.client_name && (
                            <small>{status.client_name}</small>
                        )}
                    </div>
                ) : ''
            };
        }

        return { class: 'available', editable: true, content: '' };
    };

    return (
        <div className="calendar-container">
            {renderCalendarHeader()}
            <div className="calendar-body">
                <table>
                    <tbody>
                        {renderCalendarBody()}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Calendar; 