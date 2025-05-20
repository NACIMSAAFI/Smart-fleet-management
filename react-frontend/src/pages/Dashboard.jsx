import { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import {
  getAllVehicles,
  getVehicleStatuses,
  getVehicleDurations,
  saveVehicleStatus,
  saveVehicleDuration,
  deleteVehicleStatus,
  deleteVehicleDuration,
  checkVehicleConflicts
} from '../services/vehicleService';
import authService from '../services/authService';

const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [vehicleData, setVehicleData] = useState([]);
  const [statusData, setStatusData] = useState({});
  const [durationData, setDurationData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    status: 'available',
    clientName: '',
    clientPhone: '',
    rentalPrice: '',
    cause: '',
    duration: 1
  });
  const [occupationMetrics, setOccupationMetrics] = useState({
    vehicleOccupations: [],
    fleetOccupationRatio: 0,
    fleetRentedDays: 0,
    totalPossibleDays: 0
  });

  const tooltipRef = useRef(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const formatDate = (dateInput) => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const fetchData = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const token = localStorage.getItem('token');
      if (!token) {
        authService.logout();
        return;
      }

      const [vehiclesResponse, statusesResponse, durationsResponse] = await Promise.all([
        getAllVehicles(),
        getVehicleStatuses(formatDate(firstDay), formatDate(lastDay)),
        getVehicleDurations()
      ]);

      if (vehiclesResponse?.data?.success && Array.isArray(vehiclesResponse.data.data)) {
        setVehicleData(vehiclesResponse.data.data);
      }

      if (statusesResponse?.data?.success && Array.isArray(statusesResponse.data.data)) {
        const statusObj = {};
        statusesResponse.data.data.forEach(status => {
          if (status.status_date) {
            const key = `${status.vehicle_id}-${formatDate(new Date(status.status_date))}`;
            statusObj[key] = status;
          }
        });
        setStatusData(statusObj);
      }

      if (durationsResponse?.data?.success && Array.isArray(durationsResponse.data.data)) {
        const durationObj = {};
        durationsResponse.data.data.forEach(duration => {
          if (duration.start_date) {
            const key = `${duration.vehicle_id}-${duration.start_date}`;
            durationObj[key] = duration;
          }
        });
        setDurationData(durationObj);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        authService.logout();
      }
    }
  };

  useEffect(() => {
    const initTooltip = () => {
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      document.body.appendChild(tooltip);
      tooltipRef.current = tooltip;
    };

    initTooltip();
    fetchData();

    return () => {
      if (tooltipRef.current) document.body.removeChild(tooltipRef.current);
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  useEffect(() => {
    if (vehicleData.length > 0 && Object.keys(durationData).length >= 0) {
      setTimeout(() => {
        applyStatusesToCells();
        setTimeout(() => {
          updateOccupationMetrics();
          initializeOccupationChart();
        }, 100);
      }, 100);
    }
  }, [vehicleData, statusData, durationData]);

  const navigateMonth = (offset) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const openStatusModal = (vehicleId, dateStr) => {
    const cell = document.querySelector(`.status-cell[data-vehicle-id="${vehicleId}"][data-date="${dateStr}"]`);
    
    if (cell && cell.dataset.editable === 'false') {
      alert("You can only edit the first day of a multi-day rent, reservation, or maintenance period");
      return;
    }

    const duration = Object.values(durationData).find(d => 
      d.vehicle_id == vehicleId && 
      new Date(dateStr) >= new Date(d.start_date) && 
      new Date(dateStr) <= new Date(d.end_date)
    );

    if (duration && formatDate(new Date(dateStr)) !== formatDate(new Date(duration.start_date))) {
      alert("You can only edit the first day of a multi-day period");
      return;
    }

    const vehicle = vehicleData.find(v => v.id == vehicleId);
    if (!vehicle) return;

    setSelectedVehicle(vehicle);
    setSelectedDate(dateStr);

    const statusKey = `${vehicleId}-${dateStr}`;
    let existingStatus = statusData[statusKey];

    if (!existingStatus) {
      const duration = Object.values(durationData).find(d =>
        d.vehicle_id == vehicleId &&
        new Date(dateStr) >= new Date(d.start_date) &&
        new Date(dateStr) <= new Date(d.end_date)
      );

      if (duration) {
        const startDateStr = duration.start_date;
        const durationStartKey = `${vehicleId}-${startDateStr}`;
        existingStatus = statusData[durationStartKey];
      }
    }

    let defaultFormData = {
      status: 'available',
      clientName: '',
      clientPhone: '',
      rentalPrice: '',
      cause: '',
      duration: 1
    };

    if (existingStatus) {
      defaultFormData = {
        status: existingStatus.status || 'available',
        clientName: existingStatus.client_name || '',
        clientPhone: existingStatus.client_phone || '',
        rentalPrice: existingStatus.rental_price || '',
        cause: existingStatus.cause || '',
        duration: 1
      };

      const duration = Object.values(durationData).find(d =>
        d.vehicle_id == vehicleId &&
        new Date(dateStr) >= new Date(d.start_date) &&
        new Date(dateStr) <= new Date(d.end_date)
      );

      if (duration) {
        const startDate = new Date(duration.start_date);
        const endDate = new Date(duration.end_date);
        const durationDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        defaultFormData.duration = durationDays;
      }
    }

    setFormData(defaultFormData);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedVehicle(null);
    setSelectedDate(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVehicle || !selectedDate) return;

    try {
      const startDate = new Date(selectedDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + parseInt(formData.duration) - 1);

      const isMaintenance = formData.status === 'maintenance';
      const isReservation = formData.status === 'reserved';

      const conflictCheck = await checkVehicleConflicts(
        selectedVehicle.id,
        formatDate(startDate),
        formatDate(endDate)
      );

      if (conflictCheck.hasConflict) {
        alert(`Conflict detected: ${conflictCheck.conflict.type} exists from ${conflictCheck.conflict.startDate} to ${conflictCheck.conflict.endDate}`);
        return;
      }

      await saveVehicleStatus({
        vehicle_id: selectedVehicle.id,
        status_date: formatDate(startDate),
        status: formData.status,
        client_name: !isMaintenance ? formData.clientName || null : null,
        client_phone: !isMaintenance ? formData.clientPhone || null : null,
        rental_price: !isMaintenance ? formData.rentalPrice || null : null,
        cause: isMaintenance ? formData.cause || null : null
      });

      await saveVehicleDuration({
        vehicle_id: selectedVehicle.id,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        is_maintenance: isMaintenance,
        is_reservation: isReservation
      });

      await fetchData();
      closeModal();

      setTimeout(() => {
        applyStatusesToCells();
        setTimeout(() => {
          updateOccupationMetrics();
          initializeOccupationChart();
        }, 100);
      }, 100);

    } catch (error) {
      console.error('Status update failed:', error);
      alert(`Failed to save: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleStatusDelete = async () => {
    if (!selectedVehicle || !selectedDate) return;

    try {
      const duration = Object.values(durationData).find(d => 
        d.vehicle_id == selectedVehicle.id && 
        new Date(selectedDate) >= new Date(d.start_date) && 
        new Date(selectedDate) <= new Date(d.end_date)
      );
      
      if (duration) {
        await deleteVehicleDuration(
          selectedVehicle.id,
          formatDate(new Date(duration.start_date))
        );
        
        await deleteVehicleStatus(
          selectedVehicle.id,
          duration.start_date
        );
      } else {
        await deleteVehicleStatus(
          selectedVehicle.id,
          selectedDate
        );
      }

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const [statusesResponse, durationsResponse] = await Promise.all([
        getVehicleStatuses(formatDate(firstDay), formatDate(lastDay)),
        getVehicleDurations()
      ]);

      if (statusesResponse?.data?.success) {
        const statusObj = {};
        statusesResponse.data.data.forEach(status => {
          if (status.status_date) {
            const key = `${status.vehicle_id}-${formatDate(new Date(status.status_date))}`;
            statusObj[key] = status;
          }
        });
        setStatusData(statusObj);
      }

      if (durationsResponse?.data?.success) {
        const durationObj = {};
        durationsResponse.data.data.forEach(duration => {
          if (duration.start_date) {
            const key = `${duration.vehicle_id}-${duration.start_date}`;
            durationObj[key] = duration;
          }
        });
        setDurationData(durationObj);
      }

      closeModal();
      
      setTimeout(() => {
        applyStatusesToCells();
        setTimeout(() => {
          updateOccupationMetrics();
          initializeOccupationChart();
        }, 100);
      }, 100);

    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Delete failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const showTooltip = (event, cell) => {
    if (cell.classList.contains('available') || !tooltipRef.current) {
      return;
    }

    const vehicleId = cell.dataset.vehicleId;
    const vehicle = vehicleData.find(v => v.id == vehicleId);
    if (!vehicle) return;

    const vehicleInfo = `${vehicle.brand} ${vehicle.model} (${vehicle.plate_number})`;
    const status = cell.dataset.status;
    const startDate = new Date(cell.dataset.startDate).toLocaleDateString();
    const endDate = new Date(cell.dataset.endDate).toLocaleDateString();
    const currentDate = new Date(cell.dataset.date).toLocaleDateString();
    const duration = (new Date(cell.dataset.endDate) - new Date(cell.dataset.startDate)) / (1000 * 60 * 60 * 24) + 1;

    const startDateStr = cell.dataset.startDate;
    const statusKey = `${vehicleId}-${startDateStr}`;

    const clientName = statusData[statusKey]?.client_name || cell.dataset.clientName;
    const clientPhone = statusData[statusKey]?.client_phone || cell.dataset.clientPhone;
    const rentalPrice = statusData[statusKey]?.rental_price || cell.dataset.rentalPrice;
    const maintenanceCause = statusData[statusKey]?.cause || cell.dataset.cause;

    let tooltipContent = '';
    let tooltipHeader = '';

    if (status === 'rented' || status === 'reserved') {
      tooltipHeader = status === 'rented' ? 'RENTAL INFORMATION' : 'RESERVATION INFORMATION';
      tooltipContent = `
        <div class="tooltip-content">
          <span class="tooltip-label">Vehicle:</span>
          <span class="tooltip-value">${vehicleInfo}</span>
          
          <span class="tooltip-label">Period:</span>
          <span class="tooltip-value">${startDate} to ${endDate} (${duration} days)</span>
          
          <span class="tooltip-label">Current Day:</span>
          <span class="tooltip-value">${currentDate}</span>
          
          <span class="tooltip-label">Client:</span>
          <span class="tooltip-value">${clientName || 'Not specified'}</span>
          
          <span class="tooltip-label">Phone:</span>
          <span class="tooltip-value">${clientPhone || 'Not specified'}</span>
      `;

      if (rentalPrice && !isNaN(rentalPrice)) {
        const totalPrice = (parseFloat(rentalPrice) * duration).toFixed(2);
        tooltipContent += `
          <span class="tooltip-label">Price:</span>
          <span class="tooltip-value">$${rentalPrice}/day ($${totalPrice} total)</span>
        `;
      } else {
        tooltipContent += `
          <span class="tooltip-label">Price:</span>
          <span class="tooltip-value">Not specified</span>
        `;
      }
    } else if (status === 'maintenance') {
      tooltipHeader = 'MAINTENANCE INFORMATION';
      tooltipContent = `
        <div class="tooltip-content">
          <span class="tooltip-label">Vehicle:</span>
          <span class="tooltip-value">${vehicleInfo}</span>
          
          <span class="tooltip-label">Period:</span>
          <span class="tooltip-value">${startDate} to ${endDate} (${duration} days)</span>
          
          <span class="tooltip-label">Current Day:</span>
          <span class="tooltip-value">${currentDate}</span>
          
          <span class="tooltip-label">Cause:</span>
          <span class="tooltip-value">${maintenanceCause || 'Not specified'}</span>
        </div>
      `;
    }

    tooltipContent += '</div>';

    tooltipRef.current.innerHTML = `<div class="tooltip-header">${tooltipHeader}</div>${tooltipContent}`;
    tooltipRef.current.className = `tooltip ${status}`;
    tooltipRef.current.style.display = 'block';

    moveTooltip(event);
  };

  const hideTooltip = () => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
  };

  const moveTooltip = (event) => {
    if (!tooltipRef.current || tooltipRef.current.style.display === 'none') return;

    const padding = 15;
    let x = event.pageX + padding;
    let y = event.pageY + padding;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (x + tooltipRect.width > viewportWidth) {
      x = event.pageX - tooltipRect.width - padding;
    }

    if (y + tooltipRect.height > viewportHeight) {
      y = event.pageY - tooltipRect.height - padding;
    }

    tooltipRef.current.style.left = x + 'px';
    tooltipRef.current.style.top = y + 'px';
  };

  const calculateOccupationRatios = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let fleetRentedDays = 0;
    let totalPossibleDays = vehicleData.length * daysInMonth;

    const vehicleOccupations = vehicleData.map(vehicle => {
      let rentedDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        
        const isRented = Object.values(durationData).some(duration => {
          if (duration.vehicle_id !== vehicle.id) return false;
          
          const startDate = new Date(duration.start_date);
          const endDate = new Date(duration.end_date);
          const currentDate = new Date(dateStr);
          
          if (currentDate >= startDate && currentDate <= endDate) {
            const statusKey = `${vehicle.id}-${formatDate(startDate)}`;
            const status = statusData[statusKey]?.status;
            return status === 'rented';
          }
          
          return false;
        });
        
        if (isRented) {
          rentedDays++;
          fleetRentedDays++;
        }
      }

      const ratio = (rentedDays / daysInMonth * 100).toFixed(1);
      return {
        vehicleId: vehicle.id,
        ratio,
        rentedDays,
        totalDays: daysInMonth,
        vehicleInfo: `${vehicle.brand} ${vehicle.model} (${vehicle.plate_number})`
      };
    });

    const fleetOccupationRatio = totalPossibleDays > 0
      ? (fleetRentedDays / totalPossibleDays * 100).toFixed(1)
      : 0;

    return {
      vehicleOccupations,
      fleetOccupationRatio,
      fleetRentedDays,
      totalPossibleDays
    };
  };

  const updateOccupationMetrics = () => {
    const metrics = calculateOccupationRatios();
    setOccupationMetrics(metrics);
  };

  const initializeOccupationChart = () => {
    if (!chartRef.current || typeof Chart === 'undefined') return;

    const { vehicleOccupations } = occupationMetrics;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = vehicleOccupations.map(v => v.vehicleInfo.split('(')[0].trim());
    const data = vehicleOccupations.map(v => parseFloat(v.ratio));

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Rental Occupation %',
          data,
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Rental Occupation %'
            }
          },
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 45
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                const vehicle = vehicleOccupations[context.dataIndex];
                return [
                  `Rental Occupation: ${vehicle.ratio}%`,
                  `Rented Days: ${vehicle.rentedDays}/${vehicle.totalDays}`
                ];
              }
            }
          },
          legend: {
            display: false
          }
        }
      }
    });
  };

  const applyStatusesToCells = () => {
    document.querySelectorAll('.status-cell').forEach(cell => {
      cell.className = 'status-cell available';
      cell.innerHTML = '';
      cell.dataset.editable = 'true';
    });

    for (const key in durationData) {
      const duration = durationData[key];
      if (!duration) continue;

      const startDate = new Date(duration.start_date);
      const endDate = new Date(duration.end_date);
      const vehicleId = String(duration.vehicle_id);

      const isMaintenance = Boolean(duration.is_maintenance);
      const isReservation = Boolean(duration.is_reservation);

      let statusClass, statusText;

      if (isMaintenance) {
        statusClass = 'maintenance';
        statusText = 'MAINTENANCE';
      } else if (isReservation) {
        statusClass = 'reserved';
        statusText = 'RESERVED';
      } else {
        statusClass = 'rented';
        statusText = 'RENTED';
      }

      let currentDay = new Date(startDate);
      while (currentDay <= endDate) {
        const dateStr = formatDate(currentDay);
        const cell = document.querySelector(`.status-cell[data-vehicle-id="${vehicleId}"][data-date="${dateStr}"]`);

        if (cell) {
          const isFirstDay = currentDay.getTime() === startDate.getTime();
          const isLastDay = currentDay.getTime() === endDate.getTime();

          cell.className = `status-cell ${statusClass}`;
          cell.dataset.editable = isFirstDay ? 'true' : 'false';
          cell.dataset.durationId = key;
          cell.dataset.startDate = formatDate(startDate);
          cell.dataset.endDate = formatDate(endDate);
          cell.dataset.status = statusClass;
          cell.dataset.date = dateStr;

          if (isFirstDay) {
            cell.classList.add('start-cell');
            cell.innerHTML = `<div class="status-indicator">${statusText}</div>`;

            const statusKey = `${vehicleId}-${dateStr}`;
            if (statusData[statusKey]?.client_name && (statusClass === 'rented' || statusClass === 'reserved')) {
              cell.innerHTML += `<small>${statusData[statusKey].client_name}</small>`;
              cell.dataset.clientName = statusData[statusKey].client_name;
              cell.dataset.clientPhone = statusData[statusKey].client_phone || '';
              cell.dataset.rentalPrice = statusData[statusKey].rental_price || '';
            } else if (isMaintenance && statusData[statusKey]?.cause) {
              cell.dataset.cause = statusData[statusKey].cause;
            }
          }

          if (isLastDay) {
            cell.classList.add('end-cell');
          }
        }

        currentDay.setDate(currentDay.getDate() + 1);
      }
    }
  };

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const dateHeaders = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = date.toDateString() === today.toDateString();

      dateHeaders.push(
        <th
          key={day}
          className={`date-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
          data-date={formatDate(date)}
        >
          {day}<br /><small>{date.toLocaleDateString('en-US', { weekday: 'short' })}</small>
        </th>
      );
    }

    const vehicleRows = vehicleData.map(vehicle => {
      const cells = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);

        const statusKey = `${vehicle.id}-${dateStr}`;
        const hasStatus = statusData[statusKey] ||
          Object.values(durationData).some(d =>
            d.vehicle_id == vehicle.id &&
            new Date(dateStr) >= new Date(d.start_date) &&
            new Date(dateStr) <= new Date(d.end_date)
          );

        cells.push(
          <td
            key={`${vehicle.id}-${dateStr}`}
            className={`status-cell ${hasStatus ? 'has-status' : 'available'}`}
            data-vehicle-id={vehicle.id}
            data-date={dateStr}
            onClick={() => openStatusModal(vehicle.id, dateStr)}
            onMouseEnter={(e) => showTooltip(e, e.currentTarget)}
            onMouseLeave={hideTooltip}
            onMouseMove={moveTooltip}
          >
            {hasStatus && '•'}
          </td>
        );
      }

      return (
        <tr key={vehicle.id}>
          <td className="vehicle-cell" data-vehicle-id={vehicle.id}>
            {vehicle.brand} {vehicle.model} ({vehicle.plate_number})
          </td>
          {cells}
        </tr>
      );
    });

    return (
      <>
        <tr className="date-header" id="date-header">
          <th className="vehicle-header">Vehicle</th>
          {dateHeaders}
        </tr>
        {vehicleData.length > 0 ? (
          vehicleRows
        ) : (
          <tr>
            <td colSpan={daysInMonth + 1} className="empty-message">
              No vehicles available. Please add a vehicle first.
            </td>
          </tr>
        )}
      </>
    );
  };

  const calculateDateRange = () => {
    if (!selectedDate) return { startDateDisplay: '', endDateDisplay: '' };

    const startDate = new Date(selectedDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + parseInt(formData.duration || 1) - 1);

    return {
      startDateDisplay: startDate.toLocaleDateString(),
      endDateDisplay: endDate.toLocaleDateString()
    };
  };

  const renderOccupationDisplay = () => {
    const { vehicleOccupations, fleetOccupationRatio } = occupationMetrics;

    return (
      <>
        <div className="meter-section" id="fleet-occupation">
          <h3>Fleet Rental Occupation</h3>
          <div className="occupation-meter">
            <div
              className="meter-bar"
              style={{ width: `${fleetOccupationRatio}%` }}
            ></div>
            <span className="meter-text">
              {fleetOccupationRatio}% ({occupationMetrics.fleetRentedDays}/{occupationMetrics.totalPossibleDays} days)
            </span>
          </div>
        </div>

        <div className="meter-section" id="vehicle-occupation">
          <h3>Vehicle Rental Occupation</h3>
          {vehicleOccupations.map(vehicle => (
            <div
              key={vehicle.vehicleId}
              className="vehicle-occupation-item"
              data-vehicle-id={vehicle.vehicleId}
            >
              <span className="vehicle-name">{vehicle.vehicleInfo}</span>
              <div className="vehicle-occupation-meter">
                <div
                  className="meter-bar"
                  style={{ width: `${vehicle.ratio}%` }}
                ></div>
                <span className="meter-text">
                  {vehicle.ratio}% ({vehicle.rentedDays}/{vehicle.totalDays} days)
                </span>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const { startDateDisplay, endDateDisplay } = calculateDateRange();

  return (
    <div className="dashboard-container">
      <h1>Fleet Management Dashboard</h1>

      <div className="date-navigation">
        <button onClick={() => navigateMonth(-1)}>&lt; Previous Month</button>
        <h2>{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => navigateMonth(1)}>Next Month &gt;</button>
      </div>

      <div className="status-legend">
        <div className="legend-item">
          <div className="legend-color available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-color rented"></div>
          <span>Rented</span>
        </div>
        <div className="legend-item">
          <div className="legend-color reserved"></div>
          <span>Reserved</span>
        </div>
        <div className="legend-item">
          <div className="legend-color maintenance"></div>
          <span>Maintenance</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="calendar-container">
          <div className="calendar-wrapper">
            <table className="status-calendar">
              <tbody>
                {renderCalendar()}
              </tbody>
            </table>
          </div>
        </div>

        <div className="metrics-container">
          {renderOccupationDisplay()}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="status-modal">
            <div className="modal-header">
              <h2>
                {selectedVehicle?.brand} {selectedVehicle?.model} - {selectedDate}
              </h2>
              <button className="close-button" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleStatusSubmit}>
              <div className="form-group">
                <label>Status:</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                >
                  <option value="available">Available</option>
                  <option value="rented">Rented</option>
                  <option value="reserved">Reserved</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="form-group">
                <label>Duration (days):</label>
                <input
                  type="number"
                  name="duration"
                  min="1"
                  max="31"
                  value={formData.duration}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group date-range-display">
                <span>Period: {startDateDisplay} - {endDateDisplay}</span>
              </div>

              {(formData.status === 'rented' || formData.status === 'reserved') && (
                <>
                  <div className="form-group">
                    <label>Client Name:</label>
                    <input
                      type="text"
                      name="clientName"
                      value={formData.clientName}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Client Phone:</label>
                    <input
                      type="text"
                      name="clientPhone"
                      value={formData.clientPhone}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Rental Price/Day:</label>
                    <input
                      type="number"
                      name="rentalPrice"
                      value={formData.rentalPrice}
                      onChange={handleFormChange}
                    />
                  </div>
                </>
              )}

              {formData.status === 'maintenance' && (
                <div className="form-group">
                  <label>Maintenance Cause:</label>
                  <textarea
                    name="cause"
                    value={formData.cause}
                    onChange={handleFormChange}
                  ></textarea>
                </div>
              )}

              <div className="modal-actions">
                {formData.status !== 'available' && (
                  <button
                    type="button"
                    className="delete-button"
                    onClick={handleStatusDelete}
                  >
                    Delete
                  </button>
                )}
                <button type="submit" className="save-button">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;