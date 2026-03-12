document.addEventListener('DOMContentLoaded', () => {
    const db = window.db;

    const tableBody = document.getElementById('table-body');
    const entryCount = document.getElementById('entry-count');
    const searchInput = document.getElementById('global-search');
    const statusFilter = document.getElementById('status-filter');

    // --- Cloud Database Logic ---
    const seedAttendanceData = async () => {
        if (!db) return;
        try {
            const snapshot = await db.collection('attendance').limit(1).get();
            if (snapshot.empty) {
                console.log('Seeding initial attendance data...');
                const firstNames = ["James", "Olivia", "Ethan", "Sophia", "Lucas", "Liam", "Emma", "Ava", "Mia", "Noah", "Sarah", "Marcus", "Emily"];
                const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Martinez", "Hernandez", "Jenkins", "Chen"];
                const courses = ["Computer Science", "Engineering", "Business Admin", "Cybersecurity", "Data Science"];
                const locations = ["Main Entrance", "Library", "Science Lab", "Gymnasium", "Cafeteria"];

                const batch = db.batch();
                const today = new Date().toISOString().split('T')[0];

                for (let i = 0; i < 15; i++) {
                    const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
                    const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
                    const hour = Math.floor(Math.random() * 5) + 7;
                    const minute = Math.floor(Math.random() * 60).toString().padStart(2, '0');
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour > 12 ? hour - 12 : hour;

                    const record = {
                        id: `SC-${Math.floor(Math.random() * 8000) + 1000}`,
                        name: `${fname} ${lname}`,
                        initials: `${fname[0]}${lname[0]}`,
                        email: `${fname.toLowerCase()}.${lname.toLowerCase()}@campus.edu`,
                        course: courses[Math.floor(Math.random() * courses.length)],
                        location: locations[Math.floor(Math.random() * locations.length)],
                        date: today,
                        time: `${displayHour}:${minute} ${ampm}`,
                        status: Math.random() > 0.8 ? "late" : "present",
                        method: "QR Code",
                        timestamp: firebase.firestore.Timestamp.now()
                    };
                    const ref = db.collection('attendance').doc();
                    batch.set(ref, record);
                }
                await batch.commit();
                console.log('Attendance seeded.');
            }
        } catch (error) {
            console.error('Error seeding attendance:', error);
        }
    };

    const fetchAttendance = async () => {
        if (!db) return [];
        try {
            const snapshot = await db.collection('attendance').orderBy('timestamp', 'desc').get();
            const data = [];
            snapshot.forEach(doc => data.push(doc.data()));
            return data;
        } catch (error) {
            console.error('Error fetching attendance:', error);
            return [];
        }
    };

    let allAttendanceLogs = [];

    const init = async () => {
        await seedAttendanceData();
        allAttendanceLogs = await fetchAttendance();
        renderTable(allAttendanceLogs);
    };

    // Render Table Helper
    const getStatusBadge = (status) => {
        if (status === 'present') return '<span class="badge-status badge-present"><i class="fa-solid fa-check"></i> Present</span>';
        if (status === 'late') return '<span class="badge-status badge-late"><i class="fa-solid fa-clock"></i> Late</span>';
        if (status === 'absent') return '<span class="badge-status badge-absent"><i class="fa-solid fa-xmark"></i> Absent</span>';
        return status;
    };

    const renderTable = (dataToRender) => {
        tableBody.innerHTML = '';

        if (dataToRender.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">No records found matching your criteria.</td></tr>`;
            entryCount.innerText = "0";
            return;
        }

        dataToRender.forEach(record => {
            const row = document.createElement('tr');
            // Store the document ID if available, otherwise use student ID for identification
            const docId = record.docId || '';

            row.innerHTML = `
                <td>
                    <div class="student-col">
                        <div class="avatar">${record.initials || '??'}</div>
                        <div class="student-info">
                            <span class="student-name">${record.name}</span>
                            <span class="student-email">${record.email}</span>
                        </div>
                    </div>
                </td>
                <td><strong>#${record.id}</strong></td>
                <td>${record.course}</td>
                <td>
                    <div>${record.date}</div>
                    <div class="text-muted" style="font-size: 0.85rem;">${record.time}</div>
                </td>
                <td>${record.location}</td>
                <td><i class="fa-solid fa-${record.method === 'QR Code' ? 'qrcode' : 'keyboard'} method-icon"></i> ${record.method === 'QR Code' ? 'QR' : 'ID'}</td>
                <td>${getStatusBadge(record.status)}</td>
                <td>
                    <button class="action-btn view-btn" title="View Details"><i class="fa-regular fa-eye"></i></button>
                </td>
            `;

            // Action Listeners
            row.querySelector('.view-btn').addEventListener('click', () => {
                window.location.href = `students.html?id=${record.id}`;
            });


            tableBody.appendChild(row);
        });

        entryCount.innerText = dataToRender.length;
    };


    // Filtering Logic
    const filterData = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const statusTerm = statusFilter.value;

        const filtered = allAttendanceLogs.filter(record => {
            const matchesSearch =
                record.name.toLowerCase().includes(searchTerm) ||
                record.id.toLowerCase().includes(searchTerm) ||
                record.course.toLowerCase().includes(searchTerm);

            const matchesStatus = statusTerm === 'all' || record.status === statusTerm;

            return matchesSearch && matchesStatus;
        });

        renderTable(filtered);
    };

    // Event Listeners
    searchInput.addEventListener('input', filterData);
    statusFilter.addEventListener('change', filterData);

    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (allAttendanceLogs.length === 0) {
                alert('No data available to export.');
                return;
            }

            // Define CSV headers
            const headers = ['Student Name', 'Student ID', 'Course', 'Date', 'Time', 'Location', 'Method', 'Status'];

            // Map logs to CSV rows
            const rows = allAttendanceLogs.map(log => [
                `"${log.name}"`,
                `"${log.id}"`,
                `"${log.course}"`,
                `"${log.date}"`,
                `"${log.time}"`,
                `"${log.location}"`,
                `"${log.method}"`,
                `"${log.status}"`
            ]);

            // Combine into CSV string
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            // Trigger download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `campus_attendance_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    init();

});
