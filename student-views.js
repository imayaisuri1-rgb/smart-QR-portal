// student-views.js
document.addEventListener('DOMContentLoaded', () => {
    const db = window.db;
    const listView = document.getElementById('students-list-view');
    const detailView = document.getElementById('student-detail-view');
    const studentsGrid = document.getElementById('students-grid');
    const detailProfileCard = document.getElementById('detail-profile-card');
    const detailModulesGrid = document.getElementById('detail-modules-grid');
    const backBtn = document.getElementById('back-to-list');
    const addModuleBtn = document.getElementById('add-module-btn');
    const moduleModal = document.getElementById('add-module-modal');
    const moduleForm = document.getElementById('module-form');
    const closeModuleModal = document.getElementById('close-module-modal');

    let currentEditingStudentId = null;

    const renderStudentList = async (searchTerm = '') => {
        try {
            const snapshot = await db.collection('students').get();
            studentsGrid.innerHTML = '';
            const lowerSearch = searchTerm.toLowerCase();

            snapshot.forEach(doc => {
                const student = doc.data();
                if (searchTerm && 
                    !student.name.toLowerCase().includes(lowerSearch) && 
                    !student.id.toLowerCase().includes(lowerSearch)) {
                    return;
                }

                const card = document.createElement('div');
                card.className = 'module-item';
                card.style.cursor = 'pointer';
                card.innerHTML = `
                    <div class="module-name">
                        <span>${student.name}</span>
                        <i class="fa-solid fa-user-graduate"></i>
                    </div>
                    <div class="module-grade" style="color: var(--accent); font-size: 1.2rem;">GPA: ${parseFloat(student.gpa || 0).toFixed(2)}</div>
                    <div class="text-muted" style="font-size: 0.8rem; margin-top: 5px;">ID: #${student.id}</div>
                    <div class="text-muted" style="font-size: 0.8rem;">Course: ${student.course}</div>
                `;
                card.addEventListener('click', () => showStudentDetail(student.id));
                studentsGrid.appendChild(card);
            });
        } catch (error) {
            console.error('Error rendering student list:', error);
        }
    };

    // Add Search Event Listener
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderStudentList(e.target.value);
        });
    }

    // Expose for student-manager.js
    window.renderStudentList = renderStudentList;
    document.addEventListener('studentAdded', () => renderStudentList());

    const showStudentDetail = async (studentId) => {
        currentEditingStudentId = studentId;
        try {
            const doc = await db.collection('students').doc(studentId).get();
            if (!doc.exists) return;
            const student = doc.data();

            // Populate Profile Card
            detailProfileCard.innerHTML = `
                <div class="profile-pic">
                    <i class="fa-solid fa-user-graduate"></i>
                </div>
                <div class="student-info">
                    <h3>${student.name}</h3>
                    <p>ID: #${student.id} | ${student.course}</p>
                </div>
                <div class="gpa-display">
                    <div class="text-muted" style="margin-bottom: 5px; font-size: 0.9rem;">Cumulative GPA</div>
                    <div class="gpa-value" style="color: var(--accent);">${parseFloat(student.gpa || 0).toFixed(2)}</div>
                    <div class="text-muted" style="margin-top: 5px; font-size: 0.8rem;">Out of 4.0</div>
                </div>
                <div style="margin-top: 20px; width: 100%; text-align: left;">
                    <h4 style="margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">Quick Stats</h4>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span class="text-muted">Total Credits:</span>
                        <span>${student.totalCredits || 120}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span class="text-muted">Earned Credits:</span>
                        <span>${student.earnedCredits || 0}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span class="text-muted">Academic Standing:</span>
                        <span class="${student.standing === 'Excellent' ? 'text-success' : 'text-glow'}">${student.standing || 'Good'}</span>
                    </div>
                </div>
            `;

            // Populate Modules Grid
            detailModulesGrid.innerHTML = '';
            const modules = student.modules || [];
            modules.forEach((module, index) => {
                const moduleEl = document.createElement('div');
                moduleEl.className = 'module-item';
                moduleEl.innerHTML = `
                    <div class="module-name">
                        <span>${module.name}</span>
                        <div class="admin-only" style="display: flex; gap: 10px;">
                            <i class="fa-solid fa-pen-to-square edit-icon" style="cursor: pointer; color: var(--accent);" data-index="${index}"></i>
                            <i class="fa-solid fa-trash-can delete-icon" style="cursor: pointer; color: var(--danger);" data-index="${index}"></i>
                        </div>
                    </div>
                    <div class="module-grade ${getGradeClass(module.grade)}">${module.grade}</div>
                    <div class="text-muted" style="font-size: 0.8rem; margin-top: 5px;">Score: ${module.score}%</div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${module.score}%; background: ${getGradeColor(module.grade)};"></div>
                    </div>
                `;
                detailModulesGrid.appendChild(moduleEl);
            });

            // Add Listeners for Edit/Delete icons (only visible for admins)
            const role = localStorage.getItem('role');
            if (role === 'admin') {
                detailModulesGrid.querySelectorAll('.edit-icon').forEach(icon => {
                    icon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openModuleEditor(student.id, parseInt(icon.dataset.index));
                    });
                });
                detailModulesGrid.querySelectorAll('.delete-icon').forEach(icon => {
                    icon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        deleteModule(student.id, parseInt(icon.dataset.index));
                    });
                });
            }

            listView.style.display = 'none';
            detailView.style.display = 'block';
        } catch (error) {
            console.error('Error fetching student details:', error);
        }
    };

    const getGradeClass = (grade) => {
        if (!grade) return 'grade-f';
        if (grade.startsWith('A')) return 'grade-a';
        if (grade.startsWith('B')) return 'grade-b';
        if (grade.startsWith('C')) return 'grade-c';
        return 'grade-f';
    };

    const getGradeColor = (grade) => {
        if (!grade) return 'var(--danger)';
        if (grade.startsWith('A')) return 'var(--success)';
        if (grade.startsWith('B')) return 'var(--primary)';
        if (grade.startsWith('C')) return 'var(--secondary)';
        return 'var(--danger)';
    };

    const openModuleEditor = async (studentId, moduleIndex = null) => {
        try {
            const doc = await db.collection('students').doc(studentId).get();
            const student = doc.data();
            
            document.getElementById('edit-module-index').value = moduleIndex !== null ? moduleIndex : '';
            if (moduleIndex !== null) {
                const module = student.modules[moduleIndex];
                document.getElementById('module-name-input').value = module.name;
                document.getElementById('module-score-input').value = module.score;
                document.getElementById('module-grade-input').value = module.grade;
            } else {
                moduleForm.reset();
            }
            
            moduleModal.style.display = 'flex';
        } catch (error) {
            console.error('Error opening module editor:', error);
        }
    };

    const deleteModule = async (studentId, moduleIndex) => {
        if (!confirm('Are you sure you want to delete this module?')) return;
        try {
            const doc = await db.collection('students').doc(studentId).get();
            const student = doc.data();
            student.modules.splice(moduleIndex, 1);
            updateStudentGPA(student);
            await db.collection('students').doc(studentId).update({
                modules: student.modules,
                gpa: student.gpa
            });
            showStudentDetail(studentId);
        } catch (error) {
            console.error('Error deleting module:', error);
        }
    };

    const updateStudentGPA = (student) => {
        if (!student.modules || student.modules.length === 0) {
            student.gpa = 0.0;
            return;
        }
        const gradePoints = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'F': 0.0
        };
        const totalPoints = student.modules.reduce((acc, m) => acc + (gradePoints[m.grade] || 0), 0);
        student.gpa = totalPoints / student.modules.length;
    };

    // Event Listeners
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            detailView.style.display = 'none';
            listView.style.display = 'block';
            renderStudentList();
        });
    }

    if (addModuleBtn) {
        addModuleBtn.addEventListener('click', () => openModuleEditor(currentEditingStudentId));
    }

    if (closeModuleModal) {
        closeModuleModal.addEventListener('click', () => moduleModal.style.display = 'none');
    }

    moduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const doc = await db.collection('students').doc(currentEditingStudentId).get();
            const student = doc.data();
            const indexStr = document.getElementById('edit-module-index').value;
            
            const moduleData = {
                name: document.getElementById('module-name-input').value,
                score: parseInt(document.getElementById('module-score-input').value),
                grade: document.getElementById('module-grade-input').value
            };

            if (!student.modules) student.modules = [];

            if (indexStr !== '') {
                student.modules[parseInt(indexStr)] = moduleData;
            } else {
                student.modules.push(moduleData);
            }

            updateStudentGPA(student);
            
            await db.collection('students').doc(currentEditingStudentId).update({
                modules: student.modules,
                gpa: student.gpa
            });

            moduleModal.style.display = 'none';
            showStudentDetail(currentEditingStudentId);
        } catch (error) {
            console.error('Error saving module:', error);
        }
    });

    // Initial Routing Logic
    const init = async () => {
        const role = localStorage.getItem('role');
        const loggedInStr = localStorage.getItem('loggedInStudent');
        
        // Check for URL parameter ?id=... (from global search or deep links)
        const urlParams = new URLSearchParams(window.location.search);
        const studentId = urlParams.get('id');

        if (role === 'admin') {
            listView.style.display = 'block';
            
            if (studentId) {
                const searchInput = document.getElementById('global-search');
                if (searchInput) searchInput.value = studentId;
                await renderStudentList(studentId);
            } else {
                await renderStudentList();
            }
        } else if (role === 'student' && loggedInStr) {
            const loggedInStudent = JSON.parse(loggedInStr);
            await showStudentDetail(loggedInStudent.id);
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
    };

    init();
});
