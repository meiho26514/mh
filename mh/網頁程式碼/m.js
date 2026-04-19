let roomData = [];
let currentCaptcha = "";
let activeId = "";
let cancelTargetId = "";

window.onload = () => {
    roomData = generateRooms();
    generateCaptcha();
    checkRememberedData();
};

function checkRememberedData() {
    const savedId = localStorage.getItem('rememberedId');
    const savedPwd = localStorage.getItem('rememberedPwd');
    if (savedId && savedPwd) {
        document.getElementById('stuId').value = savedId;
        document.getElementById('stuPwd').value = savedPwd;
        document.getElementById('keepLogin').checked = true;
    }
}

function handleLogin() {
    const id = document.getElementById('stuId').value;
    const pwd = document.getElementById('stuPwd').value;
    const isKeep = document.getElementById('keepLogin').checked;
    const cap = document.getElementById('captchaInput').value;

    if (id === "1234" && cap === currentCaptcha) {
        if (isKeep) {
            localStorage.setItem('rememberedId', id);
            localStorage.setItem('rememberedPwd', pwd);
        } else {
            localStorage.removeItem('rememberedId');
            localStorage.removeItem('rememberedPwd');
        }
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('mainPage').classList.remove('hidden');
        renderRooms('all');
    } else {
        document.getElementById('errorMessage').innerText = "學號、密碼或驗證碼錯誤，請檢查資料！";
        document.getElementById('errorModal').classList.remove('hidden');
        generateCaptcha();
    }
}

function generateRooms() {
    const rooms = [];
    const names = ["王同學", "李同學", "吳同學", "張同學", "陳同學", "林同學", "蔡同學", "黃同學", "柯同學"];

    for (let i = 308; i <= 316; i++) rooms.push({ id: `C${i}`, name: `電腦教室 ${i}`, type: 'computer', icon: 'fa-desktop' });
    for (let i = 408; i <= 416; i++) rooms.push({ id: `C${i}`, name: `電腦教室 ${i}`, type: 'computer', icon: 'fa-desktop' });
    [306, 307, 406, 407].forEach(i => rooms.push({ id: `M${i}`, name: `會議室 ${i}`, type: 'meeting', icon: 'fa-users' }));
    for (let i = 301; i <= 305; i++) rooms.push({ id: `R${i}`, name: `普通教室 ${i}`, type: 'normal', icon: 'fa-chalkboard' });
    for (let i = 401; i <= 405; i++) rooms.push({ id: `R${i}`, name: `普通教室 ${i}`, type: 'normal', icon: 'fa-chalkboard' });

    return rooms.map(r => ({
        ...r,
        status: Math.random() > 0.85 ? 'booked' : 'available',
        user: names[Math.floor(Math.random() * names.length)],
        time: "10:00 - 12:00"
    }));
}

function renderRooms(filter) {
    const container = document.getElementById('roomList');
    container.innerHTML = "";
    let list = roomData;
    if (filter === 'my') list = roomData.filter(r => r.status === 'mine');
    else if (filter !== 'all') list = roomData.filter(r => r.type === filter);

    document.getElementById('myCount').innerText = roomData.filter(r => r.status === 'mine').length;

    list.forEach(room => {
        const div = document.createElement('div');
        div.className = `room-card shadow-sm animate-pop type-${room.type}`;
        const isMine = room.status === 'mine';
        const isBooked = room.status === 'booked';

        const dotColor = isMine ? 'bg-[#FF9933]' : (isBooked ? 'bg-[#e74c3c]' : 'bg-[#2ecc71]');

        div.innerHTML = `
            <div class="absolute top-6 left-6 flex items-center">
                <span class="w-3.5 h-3.5 rounded-full ${dotColor}"></span>
            </div>
            <div class="w-20 h-20 bg-white/80 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-[#3366CC] border-2 border-white shadow-sm">
                <i class="fa-solid ${room.icon} text-3xl"></i>
            </div>
            <h3 class="font-black text-xl text-slate-800">${room.name}</h3>
            <p class="text-[#FF9933] font-black text-sm mb-6">${room.id}</p>
            ${room.status === 'available' ?
                `<button onclick="openBooking('${room.id}','${room.name}')" class="btn-vibrant w-full py-3 text-sm font-black">立即預約</button>` :
                `<div class="p-4 rounded-2xl ${isMine ? 'bg-[#FF9933] shadow-md' : 'bg-slate-700 shadow-lg'}">
                    <p class="card-info-text text-white mb-1">
                        ${isMine ? '<i class="fa-solid fa-circle-check mr-1"></i> 您已預約成功' : room.user + ' 預約中'}
                    </p>
                    <p class="card-info-text text-white">
                        <i class="fa-regular fa-clock mr-1"></i> ${room.time}
                    </p>
                    ${isMine ? `
                        <button onclick="cancelBooking('${room.id}')" class="mt-3 w-full py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-black rounded-xl transition-colors border border-white/30">
                            取消預約
                        </button>` : ''}
                 </div>`
            }
        `;
        container.appendChild(div);
    });
}

function openBooking(id, name) {
    activeId = id;
    document.getElementById('modalTitle').innerText = name;
    document.getElementById('modalId').innerText = id;
    document.getElementById('bookingModal').classList.remove('hidden');
}

function confirmBooking() {
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;
    const diff = (new Date(`2026-01-01 ${end}`) - new Date(`2026-01-01 ${start}`)) / 1000 / 60;

    if (diff < 15) {
        document.getElementById('errorMessage').innerText = "預約時間最少需滿 15 分鐘！";
        document.getElementById('errorModal').classList.remove('hidden');
        return;
    }

    const room = roomData.find(r => r.id === activeId);
    room.status = 'mine';
    room.time = `${start} - ${end}`;

    closeModal();
    renderRooms('all');

    document.getElementById('successRoomInfo').innerText = `${room.name} (${room.time})`;
    document.getElementById('successModal').classList.remove('hidden');
}

function cancelBooking(id) {
    cancelTargetId = id;
    const modal = document.getElementById('cancelConfirmModal');
    const confirmBtn = document.getElementById('finalCancelBtn');

    modal.classList.remove('hidden');

    confirmBtn.onclick = () => {
        roomData.find(r => r.id === cancelTargetId).status = 'available';
        renderRooms('all');
        closeCancelModal();
    };
}

function generateCaptcha() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    currentCaptcha = "";
    for (let i = 0; i < 4; i++) currentCaptcha += chars.charAt(Math.floor(Math.random() * chars.length));
    document.getElementById('captchaBox').innerText = currentCaptcha;
}

function handleLogout() {
    const isKeep = document.getElementById('keepLogin').checked;
    if (!isKeep) {
        localStorage.removeItem('rememberedId');
        localStorage.removeItem('rememberedPwd');
    }
    location.reload();
}

function showProfile() { document.getElementById('profileModal').classList.remove('hidden'); }
function closeProfile() { document.getElementById('profileModal').classList.add('hidden'); }
function closeModal() { document.getElementById('bookingModal').classList.add('hidden'); }
function closeError() { document.getElementById('errorModal').classList.add('hidden'); }
function closeCancelModal() { document.getElementById('cancelConfirmModal').classList.add('hidden'); }
function closeSuccess() { document.getElementById('successModal').classList.add('hidden'); }

function filterRooms(type, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (btn && btn.classList.contains('nav-btn')) btn.classList.add('active');
    renderRooms(type);
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('profileImageDisplay').innerHTML = `<img src="${e.target.result}" alt="頭像" class="w-full h-full object-cover">`;
            document.getElementById('navAvatarIcon').innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-xl">`;
        }
        reader.readAsDataURL(input.files[0]);
    }
}