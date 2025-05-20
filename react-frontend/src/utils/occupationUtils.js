export const calculateOccupationRatios = (vehicleData, statusData, durationData, currentDate) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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
      
      // First check if this day is part of a duration with status "rented"
      const isRented = Object.values(durationData).some(duration => {
        if (duration.vehicle_id !== vehicle.id) return false;
        
        const startDate = new Date(duration.start_date);
        const endDate = new Date(duration.end_date);
        const currentDate = new Date(dateStr);
        
        // Check if this date is within the duration period
        if (currentDate >= startDate && currentDate <= endDate) {
          // Now check if the status is "rented" (not maintenance or reserved)
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

  // Calculate fleet occupation ratio
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

const formatDate = (dateInput) => {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}; 