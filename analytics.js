document.addEventListener('DOMContentLoaded', async () => {
    const db = window.db;
    if (!db) return;

    // Chart Global Defaults
    Chart.defaults.color = '#9aa0a6';
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(22, 22, 35, 0.9)';
    Chart.defaults.plugins.tooltip.titleColor = '#00f2fe';
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(0, 242, 254, 0.2)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;

    // Helper: Get Today's Date String
    const todayStr = new Date().toISOString().split('T')[0];

    // --- 1. Fetch Student Data (for Department Breakdown) ---
    const fetchDepartmentData = async () => {
        const snapshot = await db.collection('students').get();
        const deptCounts = {};
        
        snapshot.forEach(doc => {
            const course = doc.data().course || 'Unassigned';
            deptCounts[course] = (deptCounts[course] || 0) + 1;
        });

        return {
            labels: Object.keys(deptCounts),
            data: Object.values(deptCounts)
        };
    };

    // --- 2. Fetch Attendance Data (for Traffic Chart) ---
    const fetchTrafficData = async () => {
        const snapshot = await db.collection('attendance').where('date', '==', todayStr).get();
        const hourlyStats = new Array(12).fill(0); // 7am to 6pm
        const labels = ['7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm'];

        snapshot.forEach(doc => {
            const timeStr = doc.data().time; // "HH:MM"
            if (timeStr) {
                const hour = parseInt(timeStr.split(':')[0]);
                if (hour >= 7 && hour <= 18) {
                    hourlyStats[hour - 7]++;
                }
            }
        });

        return { labels, data: hourlyStats };
    };

    // --- 3. Initialize Charts with Live Data ---
    try {
        const [deptData, trafficData] = await Promise.all([
            fetchDepartmentData(),
            fetchTrafficData()
        ]);

        // Traffic Line Chart
        const ctxTraffic = document.getElementById('trafficChart').getContext('2d');
        const gradientTraffic = ctxTraffic.createLinearGradient(0, 0, 0, 400);
        gradientTraffic.addColorStop(0, 'rgba(0, 242, 254, 0.5)');
        gradientTraffic.addColorStop(1, 'rgba(0, 242, 254, 0.05)');

        new Chart(ctxTraffic, {
            type: 'line',
            data: {
                labels: trafficData.labels,
                datasets: [{
                    label: 'Successful Verifications',
                    data: trafficData.data,
                    borderColor: '#00f2fe',
                    backgroundColor: gradientTraffic,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
            }
        });

        // Department Breakdown Doughnut
        const ctxDept = document.getElementById('departmentChart').getContext('2d');
        new Chart(ctxDept, {
            type: 'doughnut',
            data: {
                labels: deptData.labels,
                datasets: [{
                    data: deptData.data,
                    backgroundColor: ['#4e54c8', '#8f94fb', '#00f2fe', '#4facfe', '#2ed573', '#ff4757'],
                    borderWidth: 2,
                    borderColor: '#0a0a0f',
                    cutout: '65%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } }
                }
            }
        });

        // Initializing remaining static charts (Confidence & Processing)
        initStaticCharts();
        updateSystemMetrics();

    } catch (error) {
        console.error('Error initializing analytics charts:', error);
    }

    function initStaticCharts() {
        // Confidence Semi-Circle
        const ctxConfidence = document.getElementById('confidenceChart').getContext('2d');
        new Chart(ctxConfidence, {
            type: 'doughnut',
            data: {
                labels: ['Confidence', 'Errors'],
                datasets: [{
                    data: [99.2, 0.8],
                    backgroundColor: ['#00f2fe', 'rgba(255, 255, 255, 0.05)'],
                    borderWidth: 0, cutout: '80%', circumference: 180, rotation: 270
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        // Processing Times
        const ctxProcessing = document.getElementById('processingChart').getContext('2d');
        new Chart(ctxProcessing, {
            type: 'bar',
            data: {
                labels: ['Main Gate', 'Library', 'Gym', 'Lab 1', 'Lab 2'],
                datasets: [{
                    label: 'Avg Response Time (ms)',
                    data: [105, 78, 92, 130, 145],
                    backgroundColor: '#8f94fb',
                    borderRadius: 4,
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    async function updateSystemMetrics() {
        const studentSnapshot = await db.collection('students').get();
        const metricSummary = document.querySelector('.page-header p');
        if (metricSummary) {
            metricSummary.innerText = `Analyzing real-time metrics for ${studentSnapshot.size} students.`;
        }

        const storageStat = document.getElementById('model-storage-stat');
        if (storageStat) {
            const used = (studentSnapshot.size * 0.15).toFixed(1); // Mock calculation based on size
            storageStat.innerText = `${used} GB / 100 GB Used`;
        }
    }
});

