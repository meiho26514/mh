let roomData = [];
let currentCaptcha = "";
let activeId = "";
let cancelTargetId = "";
let currentUser = null;
let regGender = "男";

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

window.onload = () => {
    generateCaptcha();
    checkRememberedData();
    setupDateLimits();
};

function setupDateLimits() {
    const dateInput = document.getElementById('bookingDate');
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);
    const formatDate = (d) => d.toISOString().split('T')[0];
    if (dateInput) {
        dateInput.min = formatDate(today);
        dateInput.max = formatDate(nextMonth);
        dateInput.value = formatDate(today);
    }
}

function checkRememberedData() {
    const savedId = localStorage.getItem('rememberedId');
    const savedPwd = localStorage.getItem('rememberedPwd');
    if (savedId && savedPwd) {
        document.getElementById('stuId').value = savedId;
        document.getElementById('stuPwd').value = savedPwd;
        document.getElementById('keepLogin').checked = true;
    }
}

function showSuccess(title, msg, callback) {
    document.getElementById('successTitle').innerText = title;
    document.getElementById('successMessage').innerText = msg;
    document.getElementById('successModal').classList.remove('hidden');
    window.successAction = callback;
}

function closeSuccess() {
    document.getElementById('successModal').classList.add('hidden');
    if (window.successAction) {
        window.successAction();
        window.successAction = null;
    }
}

function showError(msg, title = "操作失敗") {
    document.getElementById('errorTitle').innerText = title;
    document.getElementById('errorMessage').innerText = msg;
    document.getElementById('errorModal').classList.remove('hidden');
}

function closeError() { document.getElementById('errorModal').classList.add('hidden'); }

function setRegGender(g) {
    regGender = g;
    document.getElementById('genderM').className = g === '男' ? "flex-1 py-2.5 rounded-2xl font-bold border-2 gender-btn-active" : "flex-1 py-2.5 rounded-2xl font-bold border-2 border-gray-100 bg-gray-50 text-gray-500";
    document.getElementById('genderF').className = g === '女' ? "flex-1 py-2.5 rounded-2xl font-bold border-2 gender-btn-active" : "flex-1 py-2.5 rounded-2xl font-bold border-2 border-gray-100 bg-gray-50 text-gray-500";
}

function showRegisterModal() { document.getElementById('registerModal').classList.remove('hidden'); }
function closeRegisterModal() { document.getElementById('registerModal').classList.add('hidden'); }

async function handleRegister() {
    const id = document.getElementById('regId').value;
    const name = document.getElementById('regName').value;
    const cls = document.getElementById('regClass').value;
    const email = document.getElementById('regEmail').value;
    const pwd = document.getElementById('regPwd').value;

    if (!id || !name || !cls || !email || !pwd) return showError("請完整填寫註冊資料！");

    let users = JSON.parse(localStorage.getItem('registeredUsers') || "[]");
    if (users.find(u => u.id === id)) return showError("此學號已被註冊！");

    const hashedPassword = await hashPassword(pwd);

    users.push({ id, name, pwd: hashedPassword, class: cls, email, gender: regGender, avatar: null });
    localStorage.setItem('registeredUsers', JSON.stringify(users));

    closeRegisterModal();
    showSuccess("註冊成功！", "請使用新帳號登入", () => {
        document.getElementById('stuId').value = id;
        document.getElementById('stuPwd').value = "";
    });
}

function showForgotModal() { document.getElementById('forgotModal').classList.remove('hidden'); }
function closeForgotModal() {
    document.getElementById('forgotModal').classList.add('hidden');
    document.getElementById('forgotStep1').classList.remove('hidden');
    document.getElementById('forgotStep2').classList.add('hidden');
}

let verifyTargetId = "";
function verifyForgot() {
    const id = document.getElementById('forgotId').value;
    const email = document.getElementById('forgotEmail').value;
    let users = JSON.parse(localStorage.getItem('registeredUsers') || "[]");
    const user = users.find(u => u.id === id && u.email === email);

    if (user) {
        verifyTargetId = id;
        document.getElementById('forgotStep1').classList.add('hidden');
        document.getElementById('forgotStep2').classList.remove('hidden');
    } else {
        showError("驗證失敗，學號或電子郵件不正確！");
    }
}

async function resetPassword() {
    const newPwd = document.getElementById('newPwd').value;
    if (!newPwd) return showError("請輸入新密碼");
    let users = JSON.parse(localStorage.getItem('registeredUsers') || "[]");
    const idx = users.findIndex(u => u.id === verifyTargetId);

    users[idx].pwd = await hashPassword(newPwd);
    localStorage.setItem('registeredUsers', JSON.stringify(users));

    closeForgotModal();
    showSuccess("更新成功", "密碼更新成功，請重新登入");
}

async function handleLogin() {
    const id = document.getElementById('stuId').value;
    const pwd = document.getElementById('stuPwd').value;
    const cap = document.getElementById('captchaInput').value;
    const isKeep = document.getElementById('keepLogin').checked;

    if (cap !== currentCaptcha) {
        showError("驗證碼錯誤！");
        generateCaptcha();
        return;
    }

    let users = JSON.parse(localStorage.getItem('registeredUsers') || "[]");

    let hashedInputPassword;
    if (pwd.length === 64) {
        hashedInputPassword = pwd;
    } else {
        hashedInputPassword = await hashPassword(pwd);
    }

    let user = users.find(u => u.id === id && u.pwd === hashedInputPassword);

    if (id === "123" && pwd === "456") {
        user = { id: "1234", name: "香蕉", class: "日四技 資訊科技4年級1班", email: "banana_meiho@edu.tw", gender: "男", avatar: "banana" };
    }

    if (user) {
        currentUser = user;
        if (isKeep) {
            localStorage.setItem('rememberedId', id);
            localStorage.setItem('rememberedPwd', hashedInputPassword);
        } else {
            localStorage.removeItem('rememberedId');
            localStorage.removeItem('rememberedPwd');
        }

        generateRandomBookings();
        loadRooms();
        updateUI();
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('mainPage').classList.remove('hidden');
        renderRooms('all');
    } else {
        showError("學號或密碼錯誤！");
        generateCaptcha();
    }
}

function generateRandomBookings() {
    const surnames = ["陳", "林", "黃", "張", "李", "王", "吳", "洪", "江", "劉", "鄭", "楊", "許", "邱", "廖", "周", "賴", "徐", "蘇", "葉", "郭", "曾", "蔡", "何", "羅"];
    const allCandidates = surnames.map(s => s + "同學");

    const allRooms = [];
    for (let i = 308; i <= 316; i++) allRooms.push(`C${i}`);
    [306, 307, 406, 407].forEach(i => allRooms.push(`M${i}`));
    for (let i = 301; i <= 305; i++) allRooms.push(`N${i}`);

    let allBookings = JSON.parse(localStorage.getItem('all_room_bookings') || "[]");
    const today = new Date().toISOString().split('T')[0];

    const randomBookings = allBookings.filter(b => b.userId.startsWith("RANDOM_"));
    if (randomBookings.length >= 10) {
        allBookings = allBookings.filter(b => !b.userId.startsWith("RANDOM_"));
    }

    let addedCount = 0;
    while (addedCount < 2) {
        const randomName = allCandidates[Math.floor(Math.random() * allCandidates.length)];
        const randomRoomId = allRooms[Math.floor(Math.random() * allRooms.length)];
        const isConflict = allBookings.some(b => b.roomId === randomRoomId && b.time.includes(today));

        if (!isConflict) {
            allBookings.push({
                id: Date.now() + addedCount,
                roomId: randomRoomId,
                userId: "RANDOM_" + Math.random().toString(36).substr(2, 5),
                userName: randomName,
                time: `${today} 08:00 - 12:00`
            });
            addedCount++;
        }
        if (allBookings.length >= allRooms.length) break;
    }
    localStorage.setItem('all_room_bookings', JSON.stringify(allBookings));
}

function loadRooms() {
    const baseRooms = [];
    for (let i = 308; i <= 316; i++) baseRooms.push({ id: `C${i}`, name: `電腦教室 ${i}`, type: 'computer', icon: 'fa-desktop' });
    [306, 307, 406, 407].forEach(i => baseRooms.push({ id: `M${i}`, name: `會議室 ${i}`, type: 'meeting', icon: 'fa-users' }));
    for (let i = 301; i <= 305; i++) baseRooms.push({ id: `N${i}`, name: `普通教室 ${i}`, type: 'normal', icon: 'fa-chalkboard' });

    const allBookings = JSON.parse(localStorage.getItem('all_room_bookings') || "[]");

    roomData = baseRooms.map(room => {
        const booking = allBookings.find(b => b.roomId === room.id);
        if (booking) {
            const isMine = booking.userId === currentUser.id;
            return {
                ...room,
                status: isMine ? 'mine' : 'booked',
                user: booking.userName,
                time: booking.time,
                bookingId: booking.id
            };
        }
        return { ...room, status: 'available', user: '', time: '' };
    });
}

function confirmBooking() {
    const date = document.getElementById('bookingDate').value;
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;

    if (!date || !start || !end) return showError("請完整選擇預約時段！");

    if (start < "07:00" || end > "22:00" || start >= "22:00") {
        return showError("此時段無法預約，可預約時間為早上7點後到晚上22點前", "操作失敗");
    }

    const startObj = new Date(`2000-01-01T${start}`);
    const endObj = new Date(`2000-01-01T${end}`);
    const diffMs = endObj - startObj;
    const diffMins = diffMs / (1000 * 60);

    if (diffMins < 15) {
        return showError("預約時間少於15分鐘無法預約", "預約失敗");
    }

    const timeStr = `${date} ${start} - ${end}`;
    let allBookings = JSON.parse(localStorage.getItem('all_room_bookings') || "[]");

    const isConflict = allBookings.some(b => {
        if (b.roomId !== activeId || !b.time.includes(date)) return false;
        const [bStart, bEnd] = b.time.split(' ').slice(1, 4).filter(s => s !== '-');
        return (start < bEnd && end > bStart);
    });

    if (isConflict) return showError("該時段已被其他同學預約囉！");

    allBookings.push({
        id: Date.now(),
        roomId: activeId,
        userId: currentUser.id,
        userName: currentUser.name,
        time: timeStr
    });

    localStorage.setItem('all_room_bookings', JSON.stringify(allBookings));

    loadRooms();
    closeModal();
    renderRooms('all');
    showSuccess("預約成功", `時段：${timeStr}`);
}

function cancelBooking(roomId) {
    cancelTargetId = roomId;
    document.getElementById('cancelConfirmModal').classList.remove('hidden');
    document.getElementById('finalCancelBtn').onclick = () => {
        let allBookings = JSON.parse(localStorage.getItem('all_room_bookings') || "[]");
        allBookings = allBookings.filter(b => !(b.roomId === roomId && b.userId === currentUser.id));
        localStorage.setItem('all_room_bookings', JSON.stringify(allBookings));

        loadRooms();
        renderRooms('all');
        closeCancelModal();
    };
}

function renderRooms(filter) {
    const container = document.getElementById('roomList');
    if (!container) return;
    container.innerHTML = "";
    let list = roomData;
    if (filter === 'my') list = roomData.filter(r => r.status === 'mine');
    else if (filter !== 'all') list = roomData.filter(r => r.type === filter);

    const allBookings = JSON.parse(localStorage.getItem('all_room_bookings') || "[]");
    document.getElementById('myCount').innerText = allBookings.filter(b => b.userId === currentUser.id).length;

    list.forEach(room => {
        const div = document.createElement('div');
        div.className = `room-card animate-pop type-${room.type}`;
        const isMine = room.status === 'mine';
        const isBooked = room.status === 'booked';
        const dotColor = isMine ? 'bg-[#FF9933]' : (isBooked ? 'bg-[#e74c3c]' : 'bg-[#2ecc71]');
        div.innerHTML = `
            <div class="absolute top-6 left-6 flex items-center"><span class="w-3.5 h-3.5 rounded-full ${dotColor}"></span></div>
            <div class="w-20 h-20 bg-white/80 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-[#3366CC] border-2 border-white shadow-sm"><i class="fa-solid ${room.icon} text-3xl"></i></div>
            <h3 class="font-black text-xl text-slate-800">${room.name}</h3>
            <p class="text-[#FF9933] font-black text-sm mb-6">${room.id}</p>
            ${room.status === 'available' ?
                `<button onclick="openBooking('${room.id}','${room.name}')" class="btn-vibrant w-full py-3 text-sm font-black">立即預約</button>` :
                `<div class="p-4 rounded-2xl ${isMine ? 'bg-[#FF9933]' : 'bg-slate-700'} shadow-md">
                    <p class="card-info-text text-white mb-1">${isMine ? '您已預約成功' : room.user + ' 預約中'}</p>
                    <p class="card-info-text text-white font-black card-time-display"><i class="fa-regular fa-clock mr-1"></i> ${room.time}</p>
                    ${isMine ? `<button onclick="cancelBooking('${room.id}')" class="mt-3 w-full py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-black rounded-xl border border-white/30">取消預約</button>` : ''}
                 </div>`
            }
        `;
        container.appendChild(div);
    });
}

function updateUI() {
    document.getElementById('navUserName').innerText = `姓名：${currentUser.name}`;
    document.getElementById('navUserId').innerText = `學號：${currentUser.id}`;
    document.getElementById('editName').value = currentUser.name;
    document.getElementById('editClass').value = currentUser.class;
    document.getElementById('editId').value = currentUser.id;
    document.getElementById('displayGender').innerText = currentUser.gender;
    document.getElementById('editEmail').value = currentUser.email;

    const avatarHTML = currentUser.avatar === "banana" ? '<span class="banana-emoji">🍌</span>' :
        (currentUser.avatar ? `<img src="${currentUser.avatar}" class="w-full h-full object-cover">` : '<i class="fa-solid fa-user"></i>');
    document.getElementById('profileImageDisplay').innerHTML = avatarHTML;
    document.getElementById('navAvatarIcon').innerHTML = avatarHTML;
}

function toggleEditProfile(isEditing) {
    const inputs = ['editName', 'editClass', 'editEmail', 'editId'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.readOnly = !isEditing;
            if (isEditing) el.classList.add('input-editing');
            else el.classList.remove('input-editing');
        }
    });
    document.getElementById('editProfileBtn').classList.toggle('hidden', isEditing);
    document.getElementById('saveProfileBtn').classList.toggle('hidden', !isEditing);
}

function openPwdModal() { document.getElementById('passwordModal').classList.remove('hidden'); }
function closePwdModal() { document.getElementById('passwordModal').classList.add('hidden'); }

async function saveProfileChanges(isPwdOnly = false) {
    const newName = document.getElementById('editName').value;
    const newClass = document.getElementById('editClass').value;
    const newEmail = document.getElementById('editEmail').value;
    const newId = document.getElementById('editId').value;
    const newPwd = document.getElementById('editPwd').value;

    if (!isPwdOnly && (!newName || !newClass || !newEmail || !newId)) return showError("欄位不可為空");
    if (isPwdOnly && !newPwd) return showError("請輸入新密碼");

    let users = JSON.parse(localStorage.getItem('registeredUsers') || "[]");
    const idx = users.findIndex(u => u.id === currentUser.id);

    if (idx !== -1) {
        if (!isPwdOnly) {
            users[idx].name = newName;
            users[idx].class = newClass;
            users[idx].email = newEmail;
            users[idx].id = newId;
        }
        if (newPwd) users[idx].pwd = await hashPassword(newPwd);

        localStorage.setItem('registeredUsers', JSON.stringify(users));
        currentUser = users[idx];
    }
    updateUI();
    if (isPwdOnly) { closePwdModal(); showSuccess("成功", "密碼已變更"); }
    else { toggleEditProfile(false); showSuccess("成功", "檔案已保存"); }
}

function resetToDefaultAvatar() {
    currentUser.avatar = (currentUser.id === "1234") ? "banana" : null;
    updateUserAvatar(currentUser.avatar);
    updateUI();
}

function updateUserAvatar(dataUrl) {
    let users = JSON.parse(localStorage.getItem('registeredUsers') || "[]");
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
        users[idx].avatar = dataUrl;
        localStorage.setItem('registeredUsers', JSON.stringify(users));
    }
}

function openBooking(id, name) {
    activeId = id;
    document.getElementById('modalTitle').innerText = name;
    document.getElementById('modalId').innerText = id;
    document.getElementById('bookingModal').classList.remove('hidden');
}

function generateCaptcha() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    currentCaptcha = "";
    for (let i = 0; i < 4; i++) currentCaptcha += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('captchaBox').innerText = currentCaptcha;
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            currentUser.avatar = e.target.result;
            updateUserAvatar(e.target.result);
            updateUI();
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function handleLogout() { location.reload(); }
function showProfile() { document.getElementById('profileModal').classList.remove('hidden'); }
function closeProfile() { toggleEditProfile(false); document.getElementById('profileModal').classList.add('hidden'); }
function closeModal() { document.getElementById('bookingModal').classList.add('hidden'); }
function closeCancelModal() { document.getElementById('cancelConfirmModal').classList.add('hidden'); }
function filterRooms(type, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (btn && btn.classList.contains('nav-btn')) btn.classList.add('active');
    renderRooms(type);
}
