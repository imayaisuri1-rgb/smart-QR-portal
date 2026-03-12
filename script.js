document.addEventListener('DOMContentLoaded', () => {
    const db = window.db;
    
    // UI Elements
    const logList = document.querySelector('.log-list');



    // Initialize Log
    const initLogs = async (role, studentName) => {
        if (!logList) return;
        logList.innerHTML = '';
        const now = new Date();
        
        try {
            if (role === 'admin') {
                // For admin, show recent scans from ALL students
                const snapshot = await db.collection('activityLogs')
                    .orderBy('timestamp', 'desc')
                    .limit(5)
                    .get();

                if (snapshot.empty) {
                    // Seed initial logs if empty
                    const seedLogs = [
                        { studentName: "Sarah Jenkins", action: "Authorized - Main Entrance", timestamp: firebase.firestore.Timestamp.now() },
                        { studentName: "Marcus Johnson", action: "Authorized - Main Entrance", timestamp: firebase.firestore.Timestamp.now() },
                        { studentName: "Emily Chen", action: "Authorized - Library", timestamp: firebase.firestore.Timestamp.now() }
                    ];
                    for(const log of seedLogs) {
                        await db.collection('activityLogs').add(log);
                    }
                    return initLogs('admin'); // retry after seed
                }

                snapshot.forEach(doc => {
                    const log = doc.data();
                    const date = log.timestamp ? log.timestamp.toDate() : new Date();
                    const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const logItem = `
                        <div class="log-item">
                            <div class="log-time">${timeStr}</div>
                            <div class="log-details">
                                <h4>${log.studentName}</h4>
                                <p>${log.action}</p>
                            </div>
                        </div>
                    `;
                    logList.insertAdjacentHTML('beforeend', logItem);
                });
            } else {
                // Student specific logs
                const snapshot = await db.collection('activityLogs')
                    .where('studentName', '==', studentName)
                    .orderBy('timestamp', 'desc')
                    .limit(5)
                    .get();

                snapshot.forEach(doc => {
                    const log = doc.data();
                    const date = log.timestamp ? log.timestamp.toDate() : new Date();
                    const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const logItem = `
                        <div class="log-item">
                            <div class="log-time">${timeStr}</div>
                            <div class="log-details">
                                <h4>${studentName}</h4>
                                <p>${log.action}</p>
                            </div>
                        </div>
                    `;
                    logList.insertAdjacentHTML('beforeend', logItem);
                });
            }
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    };
    
    // Check role and personalize dashboard
    const initDashboard = async () => {
        const role = localStorage.getItem('role');
        const adminWelcome = document.getElementById('admin-welcome');
        const loggedInStr = localStorage.getItem('loggedInStudent');
        
        // Handle "View All" activity button
        const viewAllBtn = document.getElementById('view-all-activity');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => {
                if (role === 'admin') {
                    window.location.href = 'attendance.html';
                } else {
                    window.location.href = 'students.html'; // Academic Profile
                }
            });
        }

        try {
            if (role === 'student' && loggedInStr) {
                const loggedInStudent = JSON.parse(loggedInStr);
                
                // Fetch fresh data from Firestore
                const doc = await db.collection('students').doc(loggedInStudent.id).get();
                if (!doc.exists) return;
                const student = doc.data();

                // Update Welcome
                if(adminWelcome) {
                    adminWelcome.innerHTML = `<span class="text-glow">Welcome back, ${student.name.split(' ')[0]}!</span>`;
                    const welcomeSub = adminWelcome.nextElementSibling;
                    if(welcomeSub) welcomeSub.innerText = "Here's your academic summary for the semester.";
                }

                // Update Stats
                const gpaEl = document.getElementById('student-gpa');
                const creditsEl = document.getElementById('student-credits');
                const attendanceEl = document.getElementById('student-attendance');

                if(gpaEl) gpaEl.innerText = parseFloat(student.gpa || 0).toFixed(2);
                if(creditsEl) creditsEl.innerText = student.earnedCredits || 0;
                
                // Real-time attendance percentage based on logic (placeholder for now, but 0 instead of 92)
                if(attendanceEl) attendanceEl.innerText = "100%"; 

                await initLogs('student', student.name);
            } else {
                // Default Admin view
                if(adminWelcome) adminWelcome.innerHTML = `<span class="text-glow">Welcome back, Admin!</span>`;
                
                // Admin stats calculation
                // 1. Total Students
                const studentSnapshot = await db.collection('students').get();
                const totalStudentsEl = document.getElementById('total-students-stat');
                if (totalStudentsEl) totalStudentsEl.innerText = studentSnapshot.size;

                // 2. Total Present (Count records in 'attendance' for today)
                const todayStr = new Date().toISOString().split('T')[0];
                const attendanceSnapshot = await db.collection('attendance').where('date', '==', todayStr).get();
                const totalPresentEl = document.getElementById('total-present-stat');
                if (totalPresentEl) totalPresentEl.innerText = attendanceSnapshot.size;

                // 3. Recent Logs Count
                const logsSnapshot = await db.collection('activityLogs').get();
                const logsEl = document.getElementById('recent-logs-count');
                if (logsEl) logsEl.innerText = logsSnapshot.size;

                await initLogs('admin');
            }
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    };

    initDashboard();
});

