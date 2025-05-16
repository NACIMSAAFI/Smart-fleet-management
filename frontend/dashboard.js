document.addEventListener('DOMContentLoaded', function() {
    // Global variables
    let currentDate = new Date();
    let vehicleData = []; 
    let statusData = {}; 
    let durationData = {}; 
    
    // DOM Elements
    const calendarBody = document.getElementById('calendar-body');
    const dateHeader = document.getElementById('date-header');
    const currentMonthDisplay = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('today');
    const statusModal = document.getElementById('status-modal');
    const statusForm = document.getElementById('status-form');
    const closeModalBtn = document.querySelector('.close');
    const statusSelect = document.getElementById('status-select');
    const rentalFields = document.getElementById('rental-fields');
    const maintenanceFields = document.getElementById('maintenance-fields');
    const durationInput = document.getElementById('duration');
    const startDateDisplay = document.getElementById('start-date-display');
    const endDateDisplay = document.getElementById('end-date-display');
    const deleteStatusBtn = document.getElementById('delete-status');
    const fleetOccupationDisplay = document.getElementById('fleet-occupation');
    const vehicleOccupationDisplay = document.getElementById('vehicle-occupation');
    const occupationChart = document.getElementById('occupation-chart');

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);

    // Initialize the dashboard
    initializeDashboard();

    // Event listeners
    prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
    nextMonthBtn.addEventListener('click', () => navigateMonth(1));
    todayBtn.addEventListener('click', navigateToToday);
    closeModalBtn.addEventListener('click', closeModal);
    statusSelect.addEventListener('change', toggleFieldsVisibility);
    durationInput.addEventListener('input', updateDateRangeDisplay);
    statusForm.addEventListener('submit', handleStatusSubmit);
    deleteStatusBtn.addEventListener('click', handleStatusDelete);

    document.querySelectorAll('.nav-link[href="login.html"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    });

    // Close modal if clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === statusModal) {
            closeModal();
        }
    });

    // ===== INITIALIZATION FUNCTIONS =====

    function initializeDashboard() {
        fetchData().then(() => {
            renderCalendar();
        }).catch(err => {
            console.error("Dashboard initialization failed:", err);
            // If login needed, redirect to login page
            if (err.status === 401) {
                alert("Your session has expired. Please login again.");
                window.location.href = 'login.html';
            }
        });
    }

    async function fetchData() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw { status: 401, message: "Authentication token not found" };
            }
            
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // Fetch vehicles
            const vehiclesResponse = await fetch('/api/vehicles', {
                headers: headers
            });
            
            if (!vehiclesResponse.ok) {
                throw { 
                    status: vehiclesResponse.status, 
                    message: `Failed to fetch vehicles: ${vehiclesResponse.statusText}` 
                };
            }
            
            const vehiclesResult = await vehiclesResponse.json();
            if (!vehiclesResult.success) {
                throw { message: vehiclesResult.message || "Failed to fetch vehicles data" };
            }
            
            // Ensure vehicleData is an array
            vehicleData = Array.isArray(vehiclesResult.data) ? vehiclesResult.data : [];
            
            // Fetch statuses (with proper URL path)
            const statusesResponse = await fetch(
                `/api/vehicles/statuses?start_date=${formatDate(firstDay)}&end_date=${formatDate(lastDay)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (statusesResponse.ok) {
                const statusesResult = await statusesResponse.json();
                
                // Convert array to object with vehicleId-date key
                statusData = {};
                if (statusesResult.success && Array.isArray(statusesResult.data)) {
                    statusesResult.data.forEach(status => {
                        if (status.status_date) {
                            const key = `${status.vehicle_id}-${formatDate(status.status_date)}`;
                            statusData[key] = status;
                        }
                    });
                }
                window.statusData = statusData;
            } else {
                console.warn(`Status data unavailable: ${statusesResponse.status} ${statusesResponse.statusText}`);
                statusData = {};
            }
            
            // Fetch durations (with proper URL path)
            const durationsResponse = await fetch('/api/vehicles/durations', 
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (durationsResponse.ok) {
                const durationsResult = await durationsResponse.json();
                
                // Convert array to object with vehicleId-startDate key
                durationData = {};
                if (durationsResult.success && Array.isArray(durationsResult.data)) {
                    durationsResult.data.forEach(duration => {
                        if (duration.start_date) {
                            const key = `${duration.vehicle_id}-${duration.start_date}`;
                            durationData[key] = duration;
                        }
                    });
                }
            } else {
                console.warn(`Duration data unavailable: ${durationsResponse.status} ${durationsResponse.statusText}`);
                durationData = {};
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            if (error.status === 401) {
                // Authentication error - pass this up to be handled by initializeDashboard
                throw error;
            } else {
                alert(`Failed to load data: ${error.message || 'Unknown error'}. Please refresh the page.`);
            }
        }
    }
    
    // ===== RENDERING FUNCTIONS =====

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update the month display
        currentMonthDisplay.textContent = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        // Clear existing content
        dateHeader.innerHTML = '<th class="vehicle-header">Vehicle</th>';
        calendarBody.innerHTML = '';
        
        // Get the number of days in the month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        
        // Create date headers
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isToday = date.toDateString() === today.toDateString();
            
            const th = document.createElement('th');
            th.className = `date-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`;
            th.innerHTML = `${day}<br><small>${date.toLocaleDateString('en-US', { weekday: 'short' })}</small>`;
            th.dataset.date = formatDate(date);
            dateHeader.appendChild(th);
        }
        
        // Check if vehicleData is an array and has items
        if (!Array.isArray(vehicleData) || vehicleData.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = daysInMonth + 1;
            emptyCell.textContent = 'No vehicles available. Please add a vehicle first.';
            emptyCell.className = 'empty-message';
            emptyRow.appendChild(emptyCell);
            calendarBody.appendChild(emptyRow);
            return;
        }
        
        // Create vehicle rows
        vehicleData.forEach(vehicle => {
            const row = document.createElement('tr');
            
            // Vehicle cell
            const vehicleCell = document.createElement('td');
            vehicleCell.className = 'vehicle-cell';
            vehicleCell.textContent = `${vehicle.brand} ${vehicle.model} (${vehicle.plate_number})`;
            vehicleCell.dataset.vehicleId = vehicle.id;
            row.appendChild(vehicleCell);
            
            // Create status cells for each day
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateStr = formatDate(date);
                const cell = createStatusCell(vehicle.id, dateStr);
                row.appendChild(cell);
            }
            
            calendarBody.appendChild(row);
        });
        
        // Apply status colors and data
        applyStatusesToCells();
        
        // Display occupation ratios
        displayOccupationRatios();
    }
    
    function createStatusCell(vehicleId, dateStr) {
        const cell = document.createElement('td');
        cell.className = 'status-cell available';
        cell.dataset.vehicleId = vehicleId;
        cell.dataset.date = dateStr;
        
        // Add click event
        cell.addEventListener('click', () => openStatusModal(vehicleId, dateStr));
        
        // Add tooltip events
        cell.addEventListener('mouseenter', showTooltip);
        cell.addEventListener('mouseleave', hideTooltip);
        cell.addEventListener('mousemove', moveTooltip);
        
        return cell;
    }
    
    function applyStatusesToCells() {
        // Reset all cells first
        document.querySelectorAll('.status-cell').forEach(cell => {
            cell.className = 'status-cell available';
            cell.innerHTML = '';
            cell.dataset.editable = 'true';
        });

        // Apply all durations
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
                    
                    // Add additional data attributes for tooltip
                    cell.dataset.startDate = formatDate(startDate);
                    cell.dataset.endDate = formatDate(endDate);
                    cell.dataset.status = statusClass;
                    
                    if (isFirstDay) {
                        cell.classList.add('start-cell');
                        cell.innerHTML = `<div class="status-indicator">${statusText}</div>`;
                        
                        // Add client name if available
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
    }
    
    // ===== OCCUPATION RATIO FUNCTIONS =====
    
    // Here's the modified function that calculates occupation ratios based only on rented days
    function calculateOccupationRatios() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        // Calculate fleet-wide occupation
        let fleetRentedDays = 0;
        let totalPossibleDays = vehicleData.length * daysInMonth;

        // Calculate per-vehicle and fleet occupation
        const vehicleOccupations = vehicleData.map(vehicle => {
            let rentedDays = 0;

            // Check each day of the month for this vehicle
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateStr = formatDate(date);
                const cell = document.querySelector(`.status-cell[data-vehicle-id="${vehicle.id}"][data-date="${dateStr}"]`);

                // Only count 'rented' class cells, not 'reserved' or 'maintenance'
                if (cell && cell.classList.contains('rented')) {
                    rentedDays++;
                    fleetRentedDays++;
                }
            }

            const ratio = (rentedDays / daysInMonth * 100).toFixed(1);
            return {
                vehicleId: vehicle.id,
                ratio: ratio,
                rentedDays: rentedDays,
                totalDays: daysInMonth,
                vehicleInfo: `${vehicle.brand} ${vehicle.model} (${vehicle.plate_number})`
            };
        });

        // Calculate fleet occupation ratio (based only on rented days)
        const fleetOccupationRatio = totalPossibleDays > 0 
            ? (fleetRentedDays / totalPossibleDays * 100).toFixed(1) 
            : 0;

        return {
            vehicleOccupations,
            fleetOccupationRatio,
            fleetRentedDays,
            totalPossibleDays
        };
    }

    // Update the display function to reflect that we're showing rental occupation
    function displayOccupationRatios() {
        if (!fleetOccupationDisplay || !vehicleOccupationDisplay) {
            console.warn('Occupation display elements not found');
            return;
        }
        
        const { vehicleOccupations, fleetOccupationRatio } = calculateOccupationRatios();

        // Update fleet occupation display
        const fleetMeterBar = fleetOccupationDisplay.querySelector('.meter-bar');
        const fleetMeterText = fleetOccupationDisplay.querySelector('.meter-text');
        
        if (fleetMeterBar && fleetMeterText) {
            fleetMeterBar.style.width = `${fleetOccupationRatio}%`;
            fleetMeterText.textContent = `${fleetOccupationRatio}%`;
        }

        // Update vehicle occupations display
        vehicleOccupationDisplay.innerHTML = vehicleOccupations.map(vehicle => `
            <div class="vehicle-occupation-item" data-vehicle-id="${vehicle.vehicleId}">
                <span class="vehicle-name">${vehicle.vehicleInfo}</span>
                <div class="vehicle-occupation-meter">
                    <div class="meter-bar" style="width: ${vehicle.ratio}%"></div>
                    <span class="meter-text">${vehicle.ratio}% (${vehicle.rentedDays}/${vehicle.totalDays} days)</span>
                </div>
            </div>
        `).join('');

        // Initialize chart if available
        if (occupationChart) {
            initializeOccupationChart(vehicleOccupations, fleetOccupationRatio);
        }
    }

    // Update the chart function to indicate it's showing rental occupation
    function initializeOccupationChart(vehicleOccupations, fleetRatio) {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') return;

        const ctx = occupationChart.getContext('2d');
        
        // Destroy previous chart instance if exists
        if (occupationChart.chart) {
            occupationChart.chart.destroy();
        }

        // Prepare data for chart
        const labels = vehicleOccupations.map(v => 
            `${v.vehicleInfo.split('(')[0].trim()}`);
        const data = vehicleOccupations.map(v => parseFloat(v.ratio));

        // Create new chart
        occupationChart.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Rental Occupation %',
                    data: data,
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
                            label: function(context) {
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
    }
    
    // ===== TOOLTIP FUNCTIONS =====
    
    function showTooltip(event) {
        const cell = event.currentTarget;
        // Only show tooltip for non-available cells
        if (cell.classList.contains('available')) {
            return;
        }
        const vehicle = vehicleData.find(v => v.id == cell.dataset.vehicleId);
        if (!vehicle) return;
        const vehicleInfo = `${vehicle.brand} ${vehicle.model} (${vehicle.plate_number})`;
        const status = cell.dataset.status;
        const startDate = new Date(cell.dataset.startDate).toLocaleDateString();
        const endDate = new Date(cell.dataset.endDate).toLocaleDateString();
        const currentDate = new Date(cell.dataset.date).toLocaleDateString();
        const duration = (new Date(cell.dataset.endDate) - new Date(cell.dataset.startDate)) / (1000 * 60 * 60 * 24) + 1;

        // Robust client info lookup
        let clientName = null;
        let clientPhone = null;
        let rentalPrice = null;
        let maintenanceCause = null;

        if (cell.dataset.startDate && cell.dataset.vehicleId) {
            const vehicleId = cell.dataset.vehicleId;
            const startDateStr = cell.dataset.startDate;
            const statusKey = `${vehicleId}-${startDateStr}`;
            // Debug log
            console.log('Tooltip debug:', {
                vehicleId,
                startDate: startDateStr,
                statusKey,
                statusDataEntry: statusData[statusKey]
            });
            if (statusData[statusKey]) {
                clientName = statusData[statusKey].client_name;
                clientPhone = statusData[statusKey].client_phone;
                rentalPrice = statusData[statusKey].rental_price;
                maintenanceCause = statusData[statusKey].cause;
            }
        }
        // Fallback to cell's dataset if not found in statusData
        if (!clientName) clientName = cell.dataset.clientName;
        if (!clientPhone) clientPhone = cell.dataset.clientPhone;
        if (!rentalPrice) rentalPrice = cell.dataset.rentalPrice;
        if (!maintenanceCause) maintenanceCause = cell.dataset.cause;
        
        // Create tooltip content
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
            
            // Only add price if it exists and is a number
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
        
        // Set tooltip content and show it
        tooltip.innerHTML = `<div class="tooltip-header">${tooltipHeader}</div>${tooltipContent}`;
        tooltip.className = `tooltip ${status}`;
        tooltip.style.display = 'block';
        
        // Position tooltip
        moveTooltip(event);
    }
    
    function hideTooltip() {
        tooltip.style.display = 'none';
    }
    
    function moveTooltip(event) {
        if (tooltip.style.display === 'none') return;
        
        const padding = 15;
        let x = event.pageX + padding;
        let y = event.pageY + padding;
        
        // Adjust if tooltip would go off-screen
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (x + tooltipRect.width > viewportWidth) {
            x = event.pageX - tooltipRect.width - padding;
        }
        
        if (y + tooltipRect.height > viewportHeight) {
            y = event.pageY - tooltipRect.height - padding;
        }
        
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }
    
    // ===== MODAL FUNCTIONS =====
    
    function openStatusModal(vehicleId, dateStr) {
        const cell = document.querySelector(`.status-cell[data-vehicle-id="${vehicleId}"][data-date="${dateStr}"]`);
        
        // Check if cell is editable
        if (cell.dataset.editable === 'false') {
            alert('You can only edit the first day of a multi-day reservation or maintenance period.');
            return;
        }
        
        // Set form values
        document.getElementById('vehicle-id').value = vehicleId;
        document.getElementById('status-date').value = dateStr;
        
        // Find vehicle for display
        const vehicle = vehicleData.find(v => v.id == vehicleId);
        const vehicleDisplay = `${vehicle.brand} ${vehicle.model} (${vehicle.plate_number})`;
        
        // Set modal title with vehicle and date info
        const date = new Date(dateStr);
        const modalTitle = document.querySelector('.modal-content h2');
        modalTitle.textContent = `Set Status for ${vehicleDisplay} on ${date.toLocaleDateString()}`;
        
        // Check if there's existing data for this cell
        const durationId = cell.dataset.durationId;
        
        if (durationId) {
            const duration = durationData[durationId];
            statusSelect.value = duration.is_maintenance ? 'maintenance' : duration.is_reservation ? 'reserved' : 'rented';
            
            // Calculate duration in days
            const startDate = new Date(duration.start_date);
            const endDate = new Date(duration.end_date);
            const durationDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            durationInput.value = durationDays;
            
            // Set form fields
            if (duration.is_maintenance) {
                document.getElementById('maintenance-cause').value = cell.dataset.cause || 'Scheduled maintenance';
            } else {
                // Look for client info in the status data
                const statusKey = `${vehicleId}-${dateStr}`;
                if (statusData[statusKey]) {
                    document.getElementById('client-name').value = statusData[statusKey].client_name || '';
                    document.getElementById('client-phone').value = statusData[statusKey].client_phone || '';
                    document.getElementById('rental-price').value = statusData[statusKey].rental_price || '';
                }
            }
        } else {
            // New entry
            statusSelect.value = 'available';
            durationInput.value = 1;
            document.getElementById('client-name').value = '';
            document.getElementById('client-phone').value = '';
            document.getElementById('rental-price').value = '';
            document.getElementById('maintenance-cause').value = '';
        }
        
        // Toggle fields visibility based on status
        toggleFieldsVisibility();
        
        // Update date range display
        updateDateRangeDisplay();
        
        // Show or hide delete button
        deleteStatusBtn.style.display = durationId ? 'block' : 'none';
        
        // Show modal
        statusModal.style.display = 'block';
    }
    
    function closeModal() {
        statusModal.style.display = 'none';
        statusForm.reset();
    }
    
    function toggleFieldsVisibility() {
        const status = statusSelect.value;
        
        // Hide all conditional fields first
        rentalFields.style.display = 'none';
        maintenanceFields.style.display = 'none';
        
        // Show duration field for all except 'available'
        document.querySelector('.duration-group').style.display = 
            status === 'available' ? 'none' : 'block';
        
        // Show specific fields based on status
        if (status === 'rented' || status === 'reserved') {
            rentalFields.style.display = 'block';
        } else if (status === 'maintenance') {
            maintenanceFields.style.display = 'block';
        }
    }
    
    function updateDateRangeDisplay() {
        const startDateVal = document.getElementById('status-date').value;
        const duration = parseInt(durationInput.value) || 1;
        
        if (!startDateVal) return;
        
        const startDate = new Date(startDateVal);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + duration - 1);
        
        startDateDisplay.textContent = startDate.toLocaleDateString();
        endDateDisplay.textContent = endDate.toLocaleDateString();
    }
    
    // ===== FORM HANDLING =====
    
    async function handleStatusSubmit(event) {
        event.preventDefault();
        
        try {
            const vehicleId = document.getElementById('vehicle-id').value;
            const startDateStr = document.getElementById('status-date').value;
            const status = statusSelect.value;
            const durationDays = parseInt(durationInput.value) || 1;
            
            // Calculate end date
            const startDate = new Date(startDateStr);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + durationDays - 1);
            const endDateStr = formatDate(endDate);

            // Determine status flags
            const isMaintenance = status === 'maintenance';
            const isReservation = status === 'reserved';

            // Check for conflicts
            const conflictCheck = await fetch(
                `/api/vehicles/conflicts?vehicleId=${vehicleId}&startDate=${startDateStr}&endDate=${endDateStr}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (conflictCheck.ok) {
                const conflictResult = await conflictCheck.json();
                if (conflictResult.hasConflict) {
                    throw new Error(`Vehicle is already ${conflictResult.conflict.type} during this period.`);
                }
            }

            // Prepare status data
            const statusPayload = {
                vehicle_id: vehicleId,
                status_date: startDateStr,
                status: status,
                client_name: !isMaintenance ? document.getElementById('client-name').value || null : null,
                client_phone: !isMaintenance ? document.getElementById('client-phone').value || null : null,
                rental_price: !isMaintenance ? document.getElementById('rental-price').value || null : null,
                cause: isMaintenance ? document.getElementById('maintenance-cause').value || null : null
            };

            // Prepare duration data
            const durationPayload = {
                vehicle_id: vehicleId,
                start_date: startDateStr,
                end_date: endDateStr,
                is_maintenance: isMaintenance,
                is_reservation: isReservation
            };

            // Save the status
            const statusResponse = await fetch('/api/vehicles/statuses', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(statusPayload)
            });
            
            if (!statusResponse.ok) {
                throw new Error('Failed to save status');
            }

            // Save the duration
            const durationResponse = await fetch('/api/vehicles/durations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(durationPayload)
            });
            
            if (!durationResponse.ok) {
                // If duration fails, delete the status we just created
                await fetch(`/api/vehicles/statuses/${vehicleId}/${startDateStr}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                throw new Error('Failed to save duration');
            }

            // Refresh UI
            await fetchData();
            renderCalendar();
            closeModal();
            
        } catch (error) {
            console.error('Error submitting form:', error);
            alert(`Failed to save changes: ${error.message}`);
        }
    }
    
    async function handleStatusDelete() {
        const vehicleId = document.getElementById('vehicle-id').value;
        const startDateStr = document.getElementById('status-date').value;
        
        try {
            // Find the cell
            const cell = document.querySelector(`.status-cell[data-vehicle-id="${vehicleId}"][data-date="${startDateStr}"]`);
            
            if (!cell) {
                throw new Error('Cell not found');
            }
    
            const durationId = cell.dataset.durationId;
    
            // If it's a multi-day duration, delete the duration record first
            if (durationId) {
                const duration = durationData[durationId];
                if (!duration) {
                    throw new Error('Duration data not found');
                }
    
                const durationResponse = await fetch(`/api/vehicles/durations/${vehicleId}/${formatDate(duration.start_date)}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!durationResponse.ok) {
                    throw new Error('Failed to delete duration');
                }
            }
    
            // Delete the status
            const statusResponse = await fetch(`/api/vehicles/statuses/${vehicleId}/${startDateStr}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!statusResponse.ok) {
                throw new Error('Failed to delete status');
            }
            
            // Refresh data and update UI
            await fetchData();
            renderCalendar();
            closeModal();
            
        } catch (error) {
            console.error('Error deleting status:', error);
            alert(`Failed to delete status: ${error.message}`);
        }
    }
    
    // ===== NAVIGATION FUNCTIONS =====
    
    function navigateMonth(offset) {
        currentDate.setMonth(currentDate.getMonth() + offset);
        fetchData().then(() => {
            renderCalendar();
        }); 
    }
    
    function navigateToToday() {
        currentDate = new Date();
        fetchData().then(() => {
            renderCalendar();
        });
    }
    
    // ===== UTILITY FUNCTIONS =====
    
    function formatDate(dateInput) {
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
});