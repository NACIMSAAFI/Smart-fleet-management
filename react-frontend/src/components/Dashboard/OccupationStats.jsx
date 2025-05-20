import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const OccupationStats = ({ vehicleData, statusData }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const calculateOccupationRatios = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
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
                const dateStr = date.toISOString().split('T')[0];
                const key = `${vehicle.id}-${dateStr}`;
                
                if (statusData[key]?.status === 'rented') {
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

        // Calculate fleet occupation ratio
        const fleetOccupationRatio = totalPossibleDays > 0 
            ? (fleetRentedDays / totalPossibleDays * 100).toFixed(1) 
            : 0;

        return {
            vehicleOccupations,
            fleetOccupationRatio
        };
    };

    useEffect(() => {
        const { vehicleOccupations, fleetOccupationRatio } = calculateOccupationRatios();

        // Update fleet occupation display
        const fleetMeterBar = document.querySelector('.fleet-occupation .meter-bar');
        const fleetMeterText = document.querySelector('.fleet-occupation .meter-text');
        
        if (fleetMeterBar && fleetMeterText) {
            fleetMeterBar.style.width = `${fleetOccupationRatio}%`;
            fleetMeterText.textContent = `${fleetOccupationRatio}%`;
        }

        // Update vehicle occupations display
        const vehicleOccupationDisplay = document.querySelector('.vehicle-occupation');
        if (vehicleOccupationDisplay) {
            vehicleOccupationDisplay.innerHTML = vehicleOccupations.map(vehicle => `
                <div class="vehicle-occupation-item" data-vehicle-id="${vehicle.vehicleId}">
                    <span class="vehicle-name">${vehicle.vehicleInfo}</span>
                    <div class="vehicle-occupation-meter">
                        <div class="meter-bar" style="width: ${vehicle.ratio}%"></div>
                        <span class="meter-text">${vehicle.ratio}% (${vehicle.rentedDays}/${vehicle.totalDays} days)</span>
                    </div>
                </div>
            `).join('');
        }

        // Update chart
        if (chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            chartInstance.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: vehicleOccupations.map(v => 
                        `${v.vehicleInfo.split('(')[0].trim()}`),
                    datasets: [{
                        label: 'Rental Occupation %',
                        data: vehicleOccupations.map(v => parseFloat(v.ratio)),
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
    }, [vehicleData, statusData]);

    return (
        <div className="occupation-stats">
            <div className="fleet-occupation">
                <h3>Fleet Occupation</h3>
                <div className="meter">
                    <div className="meter-bar"></div>
                    <span className="meter-text">0%</span>
                </div>
            </div>
            
            <div className="vehicle-occupation">
                <h3>Vehicle Occupation</h3>
                {/* Vehicle occupation items will be inserted here */}
            </div>
            
            <div className="occupation-chart">
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
};

export default OccupationStats; 