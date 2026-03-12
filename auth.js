document.addEventListener('DOMContentLoaded', () => {
    // Check if the user is authenticated via local storage
    const role = localStorage.getItem('role');
    const studentDataStr = localStorage.getItem('loggedInStudent');
    
    // Redirect to login if no role is found (except on login page)
    const isLoginPage = window.location.pathname.endsWith('login.html');
    
    if (!role && !isLoginPage) {
        window.location.href = 'login.html';
        return;
    }
    
    if (isLoginPage) return;

    // Redirection logic for students trying to access admin pages
    const adminPages = ['attendance.html', 'analytics.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (role === 'student' && adminPages.includes(currentPage)) {
        console.warn('Unauthorized access attempt by student to:', currentPage);
        window.location.href = 'index.html';
        return;
    }

    // Apply role-based UI changes
    const applyRoleUI = () => {
        // Find UI elements that are role specific
        const adminElements = document.querySelectorAll('.admin-only');
        const studentElements = document.querySelectorAll('.student-only');
        
        // Profile Display update
        const profileAvatar = document.querySelector('.profile-avatar span');
        const profileIcon = document.querySelector('.profile-avatar i');
        
        if (role === 'admin') {
            studentElements.forEach(el => el.style.display = 'none');
            
            if (profileAvatar) profileAvatar.innerText = 'Admin';
            if (profileIcon) {
                profileIcon.className = 'fa-solid fa-user-shield';
            }
            
        } else if (role === 'student') {
            adminElements.forEach(el => el.style.display = 'none');
            
            if (studentDataStr) {
                const student = JSON.parse(studentDataStr);
                
                // Update header
                if (profileAvatar) profileAvatar.innerText = student.name.split(' ')[0] || 'Student';
                if (profileIcon) {
                    profileIcon.className = 'fa-solid fa-user-graduate';
                }
                
                // Update navigation text
                const studentsNavLink = document.querySelector('.nav-item[href="students.html"] span');
                if (studentsNavLink) {
                    studentsNavLink.innerText = 'Academic Profile';
                }
                
                // On dashboard, hide the Live QR scanner box completely
                const liveScanSection = document.querySelector('.live-scan');
                if (liveScanSection) {
                    liveScanSection.style.display = 'none';
                    
                    // Adjust grid to fill space
                    const dashboardGrid = document.querySelector('.dashboard-grid');
                    if (dashboardGrid) {
                        dashboardGrid.style.gridTemplateColumns = '1fr';
                    }
                }
            }
        }
    };
    
    applyRoleUI();
    
    // Quick logout handler hack string to profile text for demo
    const profileAvatarEl = document.querySelector('.profile-avatar');
    if(profileAvatarEl) {
        profileAvatarEl.addEventListener('click', () => {
            if(confirm('Log out?')) {
                localStorage.removeItem('role');
                localStorage.removeItem('loggedInStudent');
                window.location.href = 'login.html';
            }
        });
        profileAvatarEl.style.cursor = 'pointer';
        profileAvatarEl.title = 'Click to log out';
    }
});
