/**
 * CampusNest - College Hostel Management System
 * Client-Side Application JavaScript (app.js)
 */

// Global State
const App = {
  dbStatus: null,
  activeFilter: 'all',
  activeBlock: 'all',
  studentsList: [],
  roomsList: [],
  allocationsList: []
};

// =====================================================================
// Toast Notification System
// =====================================================================
function showToast(title, message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✔',
    error: '✖',
    warning: '⚠',
    info: 'ℹ'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ'}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

// =====================================================================
// Confirmation Modal System
// =====================================================================
function showConfirmModal({ title, message, confirmText = 'Confirm', confirmClass = 'btn-danger', onConfirm }) {
  let modal = document.getElementById('app-confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'app-confirm-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" id="modal-title">Confirm Action</h3>
          <button class="modal-close" onclick="closeConfirmModal()">&times;</button>
        </div>
        <div class="modal-body" id="modal-body">Are you sure?</div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" onclick="closeConfirmModal()">Cancel</button>
          <button class="btn btn-sm ${confirmClass}" id="modal-confirm-btn">${confirmText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent = message;
  const confirmBtn = document.getElementById('modal-confirm-btn');
  confirmBtn.className = `btn btn-sm ${confirmClass}`;
  confirmBtn.textContent = confirmText;

  confirmBtn.onclick = () => {
    closeConfirmModal();
    if (onConfirm) onConfirm();
  };

  modal.classList.add('open');
}

function closeConfirmModal() {
  const modal = document.getElementById('app-confirm-modal');
  if (modal) modal.classList.remove('open');
}

// =====================================================================
// Database Connection Status Checker
// =====================================================================
async function checkDatabaseHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    App.dbStatus = data;

    const pill = document.querySelector('.db-status-pill');
    if (pill) {
      if (data.mode === 'mysql') {
        pill.innerHTML = `
          <span class="status-dot connected"></span>
          <span>MySQL: <strong>${data.database}</strong></span>
        `;
        pill.title = data.message;
      } else {
        pill.innerHTML = `
          <span class="status-dot"></span>
          <span>Demo Mode (In-Memory)</span>
        `;
        pill.title = 'Running with demo memory storage. Enter your MySQL password in server.js to connect MySQL Workbench.';
      }
    }
  } catch (err) {
    console.warn('Could not query /api/health:', err);
  }
}

// =====================================================================
// 1. DASHBOARD PAGE (index.html)
// =====================================================================
async function initDashboardPage() {
  const statsContainer = document.getElementById('dashboard-stats');
  if (!statsContainer) return;

  try {
    // 1. Fetch Stats
    const res = await fetch('/api/dashboard/stats');
    const stats = await res.json();

    // Render Metric Cards
    document.getElementById('stat-total-students').textContent = stats.totalStudents;
    document.getElementById('stat-total-rooms').textContent = stats.totalRooms;
    document.getElementById('stat-occupied-beds').textContent = stats.occupiedBeds;
    document.getElementById('stat-available-beds').textContent = stats.availableBeds;
    document.getElementById('stat-active-alloc').textContent = stats.activeAllocations;
    document.getElementById('stat-occupancy-rate').textContent = `${stats.occupancyRate}%`;

    const rateBar = document.getElementById('stat-rate-bar');
    if (rateBar) {
      rateBar.style.width = `${stats.occupancyRate}%`;
    }

    // 2. Fetch and render visual rooms grid
    loadDashboardRooms();

    // 3. Render Recent Allocations
    renderRecentAllocations(stats.recentAllocations || []);
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
    showToast('Error', 'Failed to load dashboard statistics.', 'error');
  }
}

async function loadDashboardRooms(blockFilter = 'all') {
  const container = document.getElementById('dashboard-rooms-grid');
  if (!container) return;

  try {
    const url = blockFilter && blockFilter !== 'all' 
      ? `/api/rooms?block=${encodeURIComponent(blockFilter)}` 
      : '/api/rooms';
    const res = await fetch(url);
    const rooms = await res.json();

    if (rooms.length === 0) {
      container.innerHTML = `
        <div class="empty-state col-full">
          <div class="empty-icon">🏢</div>
          <h3>No rooms found</h3>
          <p>No rooms match the selected block.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = rooms.map(room => {
      const pct = room.capacity > 0 ? Math.round((room.occupied / room.capacity) * 100) : 0;
      let fillClass = 'fill-low';
      if (pct >= 100) fillClass = 'fill-full';
      else if (pct >= 50) fillClass = 'fill-medium';

      const statusBadgeClass = {
        'Available': 'badge-available',
        'Full': 'badge-full',
        'Maintenance': 'badge-maintenance'
      }[room.status] || 'badge-available';

      // Generate bed dots visualizer
      let bedDots = '';
      for (let i = 0; i < room.capacity; i++) {
        const isOccupied = i < room.occupied;
        bedDots += `<span class="bed-dot ${isOccupied ? 'occupied' : ''}" title="${isOccupied ? 'Occupied bed' : 'Available bed'}"></span>`;
      }

      return `
        <div class="room-card is-${room.status.toLowerCase()}">
          <div class="room-card-header">
            <div>
              <div class="room-number">${room.room_no}</div>
              <div class="room-block">${room.block_name}</div>
            </div>
            <span class="badge ${statusBadgeClass}">${room.status}</span>
          </div>

          <div class="progress-container">
            <div class="progress-header">
              <span>Beds: ${room.occupied} / ${room.capacity}</span>
              <span>${pct}% Occupied</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${fillClass}" style="width: ${pct}%"></div>
            </div>
            <div class="bed-dots">${bedDots}</div>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: auto; padding-top: 0.5rem;">
            ${room.status === 'Available' && room.occupied < room.capacity ? `
              <a href="insert.html?tab=allocation&room_id=${room.room_id}" class="btn btn-primary btn-sm" style="flex: 1;">
                + Allocate Bed
              </a>
            ` : ''}
            <a href="update.html?type=room&id=${room.room_id}" class="btn btn-secondary btn-sm" style="flex: 1;">
              Manage
            </a>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading dashboard rooms:', err);
  }
}

function renderRecentAllocations(allocations) {
  const tbody = document.getElementById('recent-allocations-tbody');
  if (!tbody) return;

  if (allocations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No recent room allocations found.</td></tr>`;
    return;
  }

  tbody.innerHTML = allocations.map(a => `
    <tr>
      <td class="cell-primary">${a.student_name}</td>
      <td class="cell-mono">${a.roll_no}</td>
      <td><strong>${a.room_no}</strong> <span style="font-size: 0.78rem; color: var(--text-muted);">(${a.block_name})</span></td>
      <td>${a.allocation_date}</td>
      <td>
        <span class="badge ${a.status === 'Active' ? 'badge-active' : 'badge-vacated'}">
          ${a.status}
        </span>
      </td>
    </tr>
  `).join('');
}

// =====================================================================
// 2. STUDENTS PAGE (students.html)
// =====================================================================
async function initStudentsPage() {
  const table = document.getElementById('students-table');
  if (!table) return;

  await loadStudents();

  // Search Input Listener with Debounce
  const searchInput = document.getElementById('student-search');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadStudents(e.target.value, document.getElementById('branch-filter')?.value);
      }, 250);
    });
  }

  // Branch Filter Listener
  const branchFilter = document.getElementById('branch-filter');
  if (branchFilter) {
    branchFilter.addEventListener('change', (e) => {
      loadStudents(document.getElementById('student-search')?.value, e.target.value);
    });
  }
}

async function loadStudents(search = '', branch = '') {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">Loading students directory...</td></tr>`;

  try {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (branch.trim()) params.append('branch', branch.trim());

    const res = await fetch(`/api/students?${params.toString()}`);
    const students = await res.json();
    App.studentsList = students;

    const countElem = document.getElementById('student-count-badge');
    if (countElem) countElem.textContent = `${students.length} Total`;

    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-icon">🎓</div>
              <h3>No students found</h3>
              <p>Try clearing your search filters or register a new student.</p>
              <a href="insert.html?tab=student" class="btn btn-primary btn-sm">+ Register Student</a>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = students.map(s => `
      <tr>
        <td class="cell-mono">#${s.student_id}</td>
        <td class="cell-primary">${s.name}</td>
        <td class="cell-mono">${s.roll_no}</td>
        <td><span class="badge" style="background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.25);">${s.branch}</span></td>
        <td>📞 ${s.phone}</td>
        <td>👨‍👩‍👧 ${s.parent_phone}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <a href="update.html?type=student&id=${s.student_id}" class="btn btn-secondary btn-sm" title="Edit Student">
              ✏ Edit
            </a>
            <button onclick="handleDeleteStudent(${s.student_id}, '${s.name.replace(/'/g, "\\'")}')" class="btn btn-danger-outline btn-sm" title="Delete Student">
              🗑 Delete
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error fetching students:', err);
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--color-danger); text-align:center;">Failed to load students.</td></tr>`;
  }
}

function handleDeleteStudent(id, name) {
  showConfirmModal({
    title: 'Delete Student',
    message: `Are you sure you want to permanently delete student "${name}" (ID #${id})? Note: Students with active room allocations cannot be deleted until vacated.`,
    confirmText: 'Delete Student',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (res.ok) {
          showToast('Success', result.message || 'Student deleted successfully.');
          loadStudents(document.getElementById('student-search')?.value, document.getElementById('branch-filter')?.value);
        } else {
          showToast('Cannot Delete', result.error || 'Failed to delete student.', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }
  });
}

// =====================================================================
// 3. ROOMS PAGE (rooms.html)
// =====================================================================
async function initRoomsPage() {
  const container = document.getElementById('rooms-container');
  if (!container) return;

  await loadRooms();

  // Block Filter
  const blockFilter = document.getElementById('room-block-filter');
  if (blockFilter) {
    blockFilter.addEventListener('change', () => loadRooms());
  }

  // Status Filter
  const statusFilter = document.getElementById('room-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => loadRooms());
  }
}

async function loadRooms() {
  const gridContainer = document.getElementById('rooms-grid-view');
  const tableContainer = document.getElementById('rooms-table-tbody');
  if (!gridContainer && !tableContainer) return;

  const block = document.getElementById('room-block-filter')?.value || '';
  const status = document.getElementById('room-status-filter')?.value || '';

  const params = new URLSearchParams();
  if (block && block !== 'all') params.append('block', block);
  if (status && status !== 'all') params.append('status', status);

  try {
    const res = await fetch(`/api/rooms?${params.toString()}`);
    const rooms = await res.json();
    App.roomsList = rooms;

    const countBadge = document.getElementById('room-count-badge');
    if (countBadge) countBadge.textContent = `${rooms.length} Rooms`;

    if (rooms.length === 0) {
      if (gridContainer) {
        gridContainer.innerHTML = `
          <div class="empty-state col-full">
            <div class="empty-icon">🛏</div>
            <h3>No rooms match your filters</h3>
            <p>Try switching blocks or status filter.</p>
            <a href="insert.html?tab=room" class="btn btn-primary btn-sm">+ Add New Room</a>
          </div>
        `;
      }
      if (tableContainer) {
        tableContainer.innerHTML = `<tr><td colspan="7" class="empty-state">No rooms found.</td></tr>`;
      }
      return;
    }

    // Render Grid View
    if (gridContainer) {
      gridContainer.innerHTML = rooms.map(room => {
        const pct = room.capacity > 0 ? Math.round((room.occupied / room.capacity) * 100) : 0;
        let fillClass = 'fill-low';
        if (pct >= 100) fillClass = 'fill-full';
        else if (pct >= 50) fillClass = 'fill-medium';

        const statusBadgeClass = {
          'Available': 'badge-available',
          'Full': 'badge-full',
          'Maintenance': 'badge-maintenance'
        }[room.status] || 'badge-available';

        let bedDots = '';
        for (let i = 0; i < room.capacity; i++) {
          const isOccupied = i < room.occupied;
          bedDots += `<span class="bed-dot ${isOccupied ? 'occupied' : ''}" title="${isOccupied ? 'Occupied bed' : 'Available bed'}"></span>`;
        }

        return `
          <div class="room-card is-${room.status.toLowerCase()}">
            <div class="room-card-header">
              <div>
                <div class="room-number">${room.room_no}</div>
                <div class="room-block">${room.block_name}</div>
              </div>
              <span class="badge ${statusBadgeClass}">${room.status}</span>
            </div>

            <div class="progress-container">
              <div class="progress-header">
                <span>Occupancy: <strong>${room.occupied} / ${room.capacity}</strong> Beds</span>
                <span>${pct}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill ${fillClass}" style="width: ${pct}%"></div>
              </div>
              <div class="bed-dots">${bedDots}</div>
            </div>

            <div style="display: flex; gap: 0.5rem; margin-top: auto; padding-top: 0.5rem;">
              <a href="update.html?type=room&id=${room.room_id}" class="btn btn-secondary btn-sm" style="flex: 1;">
                ⚙ Configure
              </a>
              ${room.occupied === 0 ? `
                <button onclick="handleDeleteRoom(${room.room_id}, '${room.room_no}')" class="btn btn-danger-outline btn-sm" title="Delete Room">
                  🗑
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Table View
    if (tableContainer) {
      tableContainer.innerHTML = rooms.map(room => {
        const statusBadgeClass = {
          'Available': 'badge-available',
          'Full': 'badge-full',
          'Maintenance': 'badge-maintenance'
        }[room.status] || 'badge-available';

        return `
          <tr>
            <td class="cell-mono">#${room.room_id}</td>
            <td class="cell-primary">${room.room_no}</td>
            <td>${room.block_name}</td>
            <td>${room.capacity} Beds</td>
            <td><strong>${room.occupied}</strong> Occupied</td>
            <td><span class="badge ${statusBadgeClass}">${room.status}</span></td>
            <td>
              <div style="display: flex; gap: 0.4rem;">
                <a href="update.html?type=room&id=${room.room_id}" class="btn btn-secondary btn-sm">Edit</a>
                ${room.occupied === 0 ? `
                  <button onclick="handleDeleteRoom(${room.room_id}, '${room.room_no}')" class="btn btn-danger-outline btn-sm">Delete</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

  } catch (err) {
    console.error('Error loading rooms:', err);
  }
}

function handleDeleteRoom(id, roomNo) {
  showConfirmModal({
    title: 'Delete Room',
    message: `Are you sure you want to delete room "${roomNo}"? You can only delete rooms with 0 current occupants.`,
    confirmText: 'Delete Room',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (res.ok) {
          showToast('Deleted', result.message || 'Room removed.');
          loadRooms();
        } else {
          showToast('Cannot Delete', result.error || 'Failed to delete room.', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }
  });
}

// =====================================================================
// 4. ALLOCATIONS PAGE (allocations.html)
// =====================================================================
async function initAllocationsPage() {
  const table = document.getElementById('allocations-table');
  if (!table) return;

  await loadAllocations();

  // Status Filter Listener
  const statusFilter = document.getElementById('allocation-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      loadAllocations(e.target.value, document.getElementById('allocation-search')?.value);
    });
  }

  // Search Filter Listener
  const searchInput = document.getElementById('allocation-search');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        loadAllocations(document.getElementById('allocation-status-filter')?.value, e.target.value);
      }, 250);
    });
  }
}

async function loadAllocations(status = 'all', search = '') {
  const tbody = document.getElementById('allocations-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">Loading allocations log...</td></tr>`;

  try {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);

    const res = await fetch(`/api/allocations?${params.toString()}`);
    let allocations = await res.json();

    if (search && search.trim()) {
      const term = search.toLowerCase().trim();
      allocations = allocations.filter(a => 
        a.student_name.toLowerCase().includes(term) ||
        a.roll_no.toLowerCase().includes(term) ||
        a.room_no.toLowerCase().includes(term) ||
        a.block_name.toLowerCase().includes(term)
      );
    }

    App.allocationsList = allocations;

    const countBadge = document.getElementById('alloc-count-badge');
    if (countBadge) countBadge.textContent = `${allocations.length} Records`;

    if (allocations.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-icon">🔑</div>
              <h3>No allocations found</h3>
              <p>No room allocation records match your filter criteria.</p>
              <a href="insert.html?tab=allocation" class="btn btn-primary btn-sm">+ New Allocation</a>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = allocations.map(a => {
      const isActive = a.status === 'Active';
      return `
        <tr>
          <td class="cell-mono">#${a.allocation_id}</td>
          <td class="cell-primary">
            <div>${a.student_name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">📞 ${a.phone || ''}</div>
          </td>
          <td class="cell-mono">${a.roll_no}</td>
          <td>
            <strong>${a.room_no}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${a.block_name}</div>
          </td>
          <td>${a.allocation_date}</td>
          <td>${a.vacate_date ? a.vacate_date : '<span style="color:var(--text-muted); font-size: 0.8rem;">— (Active)</span>'}</td>
          <td>
            <span class="badge ${isActive ? 'badge-active' : 'badge-vacated'}">
              ${a.status}
            </span>
          </td>
          <td>
            ${isActive ? `
              <button onclick="handleVacateRoom(${a.allocation_id}, '${a.student_name.replace(/'/g, "\\'")}', '${a.room_no}')" class="btn btn-danger-outline btn-sm" style="padding: 0.35rem 0.75rem;">
                🚪 Vacate Room
              </button>
            ` : `
              <span style="font-size: 0.78rem; color: var(--text-muted);">Vacated</span>
            `}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading allocations:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="color:var(--color-danger); text-align:center;">Failed to load allocations.</td></tr>`;
  }
}

function handleVacateRoom(id, studentName, roomNo) {
  showConfirmModal({
    title: 'Vacate Room Confirmation',
    message: `Are you sure you want to mark Room "${roomNo}" as VACATED for student "${studentName}"? This will set today's vacate date, mark the allocation as Vacated, and free up 1 bed in ${roomNo}.`,
    confirmText: 'Yes, Vacate Room',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        const res = await fetch(`/api/allocations/${id}/vacate`, { method: 'PUT' });
        const result = await res.json();
        if (res.ok) {
          showToast('Room Vacated', result.message || 'Room vacated and bed count updated.');
          loadAllocations(document.getElementById('allocation-status-filter')?.value, document.getElementById('allocation-search')?.value);
        } else {
          showToast('Error', result.error || 'Failed to vacate room.', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    }
  });
}

// =====================================================================
// 5. INSERT PAGE (insert.html)
// =====================================================================
async function initInsertPage() {
  const tabsContainer = document.querySelector('.tabs-nav');
  if (!tabsContainer) return;

  // Tab switching logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(tabId) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tabId}`));
    
    if (tabId === 'allocation') {
      populateAllocationDropdowns();
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Check URL params for direct tab selection (?tab=student | room | allocation)
  const urlParams = new URLSearchParams(window.location.search);
  const requestedTab = urlParams.get('tab') || 'student';
  switchTab(requestedTab);

  // Set default allocation date to today
  const allocDateInput = document.getElementById('alloc-date');
  if (allocDateInput) {
    allocDateInput.value = new Date().toISOString().split('T')[0];
  }

  // Bind Form Submissions
  setupStudentForm();
  setupRoomForm();
  setupAllocationForm();
}

// Populate dropdowns for New Allocation Form
async function populateAllocationDropdowns() {
  const studentSelect = document.getElementById('alloc-student-select');
  const roomSelect = document.getElementById('alloc-room-select');
  if (!studentSelect || !roomSelect) return;

  try {
    // 1. Fetch Students & Allocations to filter out students already with an Active room
    const [studentsRes, allocationsRes, roomsRes] = await Promise.all([
      fetch('/api/students'),
      fetch('/api/allocations?status=Active'),
      fetch('/api/rooms?availableOnly=true')
    ]);

    const students = await studentsRes.json();
    const activeAllocations = await allocationsRes.json();
    const availableRooms = await roomsRes.json();

    const activeStudentIds = new Set(activeAllocations.map(a => a.student_id));
    const eligibleStudents = students.filter(s => !activeStudentIds.has(s.student_id));

    studentSelect.innerHTML = eligibleStudents.length === 0
      ? '<option value="">All registered students currently have active room allocations</option>'
      : '<option value="">-- Choose Student --</option>' + eligibleStudents.map(s => 
          `<option value="${s.student_id}">${s.name} (${s.roll_no} - ${s.branch})</option>`
        ).join('');

    // Pre-select if passed in URL
    const urlParams = new URLSearchParams(window.location.search);
    const preStudentId = urlParams.get('student_id');
    if (preStudentId) studentSelect.value = preStudentId;

    roomSelect.innerHTML = availableRooms.length === 0
      ? '<option value="">No rooms currently have available beds</option>'
      : '<option value="">-- Choose Available Room --</option>' + availableRooms.map(r => {
          const freeBeds = r.capacity - r.occupied;
          return `<option value="${r.room_id}">${r.room_no} (${r.block_name}) - ${freeBeds} bed${freeBeds > 1 ? 's' : ''} available</option>`;
        }).join('');

    const preRoomId = urlParams.get('room_id');
    if (preRoomId) roomSelect.value = preRoomId;

  } catch (err) {
    console.error('Error populating dropdowns:', err);
  }
}

function setupStudentForm() {
  const form = document.getElementById('form-insert-student');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving Student...';

    const payload = {
      name: document.getElementById('student-name').value.trim(),
      roll_no: document.getElementById('student-roll').value.trim(),
      branch: document.getElementById('student-branch').value,
      phone: document.getElementById('student-phone').value.trim(),
      parent_phone: document.getElementById('student-parent-phone').value.trim()
    };

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Success!', `Student "${payload.name}" registered successfully.`);
        form.reset();
      } else {
        showToast('Error', data.error || 'Failed to insert student', 'error');
      }
    } catch (err) {
      showToast('Error', err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

function setupRoomForm() {
  const form = document.getElementById('form-insert-room');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Creating Room...';

    const payload = {
      room_no: document.getElementById('room-no').value.trim(),
      block_name: document.getElementById('room-block').value,
      capacity: parseInt(document.getElementById('room-capacity').value),
      status: document.getElementById('room-status').value
    };

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Success!', `Room "${payload.room_no}" added to ${payload.block_name}.`);
        form.reset();
      } else {
        showToast('Error', data.error || 'Failed to create room', 'error');
      }
    } catch (err) {
      showToast('Error', err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

function setupAllocationForm() {
  const form = document.getElementById('form-insert-allocation');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Allocating Bed...';

    const payload = {
      student_id: parseInt(document.getElementById('alloc-student-select').value),
      room_id: parseInt(document.getElementById('alloc-room-select').value),
      allocation_date: document.getElementById('alloc-date').value
    };

    try {
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showToast('Allocated!', data.message || 'Room bed allocated successfully.');
        form.reset();
        document.getElementById('alloc-date').value = new Date().toISOString().split('T')[0];
        // Refresh dropdowns to reflect new occupancy
        populateAllocationDropdowns();
      } else {
        showToast('Allocation Failed', data.error || 'Unable to allocate room', 'error');
      }
    } catch (err) {
      showToast('Error', err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

// =====================================================================
// 6. UPDATE PAGE (update.html)
// =====================================================================
async function initUpdatePage() {
  const formStudent = document.getElementById('form-update-student');
  const formRoom = document.getElementById('form-update-room');
  if (!formStudent && !formRoom) return;

  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get('type') || 'student';
  const id = urlParams.get('id');

  // Toggle visible section
  const sectionStudent = document.getElementById('section-update-student');
  const sectionRoom = document.getElementById('section-update-room');
  const selector = document.getElementById('update-entity-selector');

  function showSection(targetType) {
    if (selector) selector.value = targetType;
    if (sectionStudent) sectionStudent.style.display = targetType === 'student' ? 'block' : 'none';
    if (sectionRoom) sectionRoom.style.display = targetType === 'room' ? 'block' : 'none';
  }

  if (selector) {
    selector.addEventListener('change', (e) => showSection(e.target.value));
  }
  showSection(type);

  // Populate Dropdowns for Quick Selection
  await populateUpdateSelectors();

  // If ID is given in query, pre-load that entity
  if (id) {
    if (type === 'student') {
      loadStudentIntoForm(id);
    } else if (type === 'room') {
      loadRoomIntoForm(id);
    }
  }

  // Student Update Submission
  if (formStudent) {
    formStudent.addEventListener('submit', async (e) => {
      e.preventDefault();
      const studentId = document.getElementById('update-student-id').value;
      if (!studentId) {
        showToast('Select Student', 'Please select a student to update.', 'warning');
        return;
      }

      const payload = {
        name: document.getElementById('update-student-name').value.trim(),
        roll_no: document.getElementById('update-student-roll').value.trim(),
        branch: document.getElementById('update-student-branch').value,
        phone: document.getElementById('update-student-phone').value.trim(),
        parent_phone: document.getElementById('update-student-parent-phone').value.trim()
      };

      try {
        const res = await fetch(`/api/students/${studentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Updated!', data.message || 'Student records updated successfully.');
          populateUpdateSelectors();
        } else {
          showToast('Update Failed', data.error || 'Failed to update student.', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    });
  }

  // Room Update Submission
  if (formRoom) {
    formRoom.addEventListener('submit', async (e) => {
      e.preventDefault();
      const roomId = document.getElementById('update-room-id').value;
      if (!roomId) {
        showToast('Select Room', 'Please select a room to configure.', 'warning');
        return;
      }

      const payload = {
        room_no: document.getElementById('update-room-no').value.trim(),
        block_name: document.getElementById('update-room-block').value,
        capacity: parseInt(document.getElementById('update-room-capacity').value),
        status: document.getElementById('update-room-status').value
      };

      try {
        const res = await fetch(`/api/rooms/${roomId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          showToast('Updated!', data.message || 'Room settings updated successfully.');
          populateUpdateSelectors();
        } else {
          showToast('Update Failed', data.error || 'Failed to update room.', 'error');
        }
      } catch (err) {
        showToast('Error', err.message, 'error');
      }
    });
  }
}

async function populateUpdateSelectors() {
  const selectStudent = document.getElementById('select-student-picker');
  const selectRoom = document.getElementById('select-room-picker');

  try {
    const [sRes, rRes] = await Promise.all([fetch('/api/students'), fetch('/api/rooms')]);
    const students = await sRes.json();
    const rooms = await rRes.json();

    if (selectStudent) {
      selectStudent.innerHTML = '<option value="">-- Choose student to edit --</option>' +
        students.map(s => `<option value="${s.student_id}">#${s.student_id} - ${s.name} (${s.roll_no})</option>`).join('');

      selectStudent.onchange = (e) => {
        if (e.target.value) loadStudentIntoForm(e.target.value);
      };
    }

    if (selectRoom) {
      selectRoom.innerHTML = '<option value="">-- Choose room to configure --</option>' +
        rooms.map(r => `<option value="${r.room_id}">#${r.room_id} - Room ${r.room_no} (${r.block_name}) [${r.status}]</option>`).join('');

      selectRoom.onchange = (e) => {
        if (e.target.value) loadRoomIntoForm(e.target.value);
      };
    }
  } catch (err) {
    console.error('Error fetching selectors:', err);
  }
}

async function loadStudentIntoForm(id) {
  try {
    const res = await fetch(`/api/students/${id}`);
    if (!res.ok) throw new Error('Student not found');
    const s = await res.json();

    document.getElementById('update-student-id').value = s.student_id;
    document.getElementById('update-student-name').value = s.name;
    document.getElementById('update-student-roll').value = s.roll_no;
    document.getElementById('update-student-branch').value = s.branch;
    document.getElementById('update-student-phone').value = s.phone;
    document.getElementById('update-student-parent-phone').value = s.parent_phone;

    const select = document.getElementById('select-student-picker');
    if (select) select.value = id;
  } catch (err) {
    showToast('Notice', 'Could not load student details.', 'error');
  }
}

async function loadRoomIntoForm(id) {
  try {
    const res = await fetch(`/api/rooms/${id}`);
    if (!res.ok) throw new Error('Room not found');
    const r = await res.json();

    document.getElementById('update-room-id').value = r.room_id;
    document.getElementById('update-room-no').value = r.room_no;
    document.getElementById('update-room-block').value = r.block_name;
    document.getElementById('update-room-capacity').value = r.capacity;
    document.getElementById('update-room-status').value = r.status;

    const occupiedHint = document.getElementById('room-occupied-info');
    if (occupiedHint) {
      occupiedHint.textContent = `Currently occupied beds: ${r.occupied} / ${r.capacity}`;
    }

    const select = document.getElementById('select-room-picker');
    if (select) select.value = id;
  } catch (err) {
    showToast('Notice', 'Could not load room details.', 'error');
  }
}

// =====================================================================
// Global Page Initialization Dispatcher
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Check backend & DB connectivity
  checkDatabaseHealth();

  // Dispatch page-specific logic
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith('students.html') || path.includes('/students')) {
    initStudentsPage();
  } else if (path.endsWith('rooms.html') || path.includes('/rooms')) {
    initRoomsPage();
  } else if (path.endsWith('allocations.html') || path.includes('/allocations')) {
    initAllocationsPage();
  } else if (path.endsWith('insert.html') || path.includes('/insert')) {
    initInsertPage();
  } else if (path.endsWith('update.html') || path.includes('/update')) {
    initUpdatePage();
  } else {
    // Default to Dashboard
    initDashboardPage();
  }
});
