// --- 1. CONFIGURACIÓN ---
const SUPA_URL = 'https://jkjifmrrlyncuwpjhxvk.supabase.co';
const SUPA_KEY = 'sb_publishable_xnIELom1ouXaBDJNYaWDAQ_VJNjlnIK';
const client = window.supabase.createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;
let isAdmin = false;
let userBonos = 0;
let allUsersCache = [];
let allClasesCache = [];
let selectedDate = null;
let currentCalendarMonth = new Date();
let allConfigCache = [];
let allProfesoresCache = [];
let datePickerInstance = null;

// --- 2. AUTHENTICATION ---
function toggleAuth(view) {
    const login = document.getElementById('login-card');
    const reg = document.getElementById('register-card');

    if (view === 'register') {
        login.classList.add('hidden');
        reg.classList.remove('hidden');
        reg.classList.add('fade-in');
    } else {
        reg.classList.add('hidden');
        login.classList.remove('hidden');
        login.classList.add('fade-in');
    }
}

client.auth.onAuthStateChange((event, session) => {
    const auth = document.getElementById('auth-container');
    const app = document.getElementById('app-view');

    if (session) {
        auth.classList.add('hidden');
        app.classList.remove('hidden');
        currentUser = session.user;
        initApp();
        loadProfileCard();
    } else {
        app.classList.add('hidden');
        auth.classList.remove('hidden');
        currentUser = null;
        document.body.classList.remove('is-admin');
    }
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    Swal.fire({
        title: 'Entrando...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        background: '#fff',
        color: '#333'
    });

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) Swal.fire({
        icon: 'error',
        title: 'Ups...',
        text: 'Credenciales incorrectas.',
        confirmButtonColor: '#1a4d4f'
    });
    else Swal.close();
});

document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (password.length < 6) return Swal.fire('Contraseña débil', 'Usa al menos 6 caracteres.', 'warning');

    Swal.showLoading();
    const { error } = await client.auth.signUp({ email, password });

    if (error) Swal.fire('Error', error.message, 'error');
    else Swal.fire({
        icon: 'success',
        title: '¡Bienvenido a HAM Yoga!',
        text: '¡Tu cuenta ha sido creada con éxito!.',
        confirmButtonColor: '#1a4d4f'
    });
});

async function logout() {
    await client.auth.signOut();
    location.reload();
}

// Mapeo de configuraciones con información amigable
const CONFIG_INFO = {
    'horas_limite_cancelacion': {
        nombre: 'Tiempo límite para cancelar',
        descripcion: 'Horas mínimas de anticipación requeridas para cancelar una reserva',
        icono: 'ph-clock-countdown',
        tipo: 'numero',
        unidad: 'horas',
        categoria: 'Reservas'
    },
    'permitir_cancelacion_admin_siempre': {
        nombre: 'Admins cancelan siempre',
        descripcion: 'Permitir que administradores cancelen reservas sin límite de tiempo',
        icono: 'ph-shield-check',
        tipo: 'booleano',
        categoria: 'Permisos'
    },
    'max_reservas_simultaneas': {
        nombre: 'Reservas simultáneas por usuario',
        descripcion: 'Número máximo de reservas activas que puede tener un usuario',
        icono: 'ph-users',
        tipo: 'numero',
        unidad: 'reservas',
        categoria: 'Límites'
    },
    'dias_anticipacion_max': {
        nombre: 'Anticipación máxima',
        descripcion: 'Cuántos días en el futuro se puede reservar',
        icono: 'ph-calendar-plus',
        tipo: 'numero',
        unidad: 'días',
        categoria: 'Reservas'
    }
};

// --- 3. APP INIT & PROFILE ---

function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function initApp() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');

    // Init Flatpickr
    datePickerInstance = flatpickr("#clase-fecha", {
        locale: "es",
        dateFormat: "Y-m-d",
        firstDayOfWeek: 1,
        disableMobile: "true"
    });

    await cargarProfesoresCache();
    await checkProfile();
    await cargarHorarios();
    renderizarCalendario();
}

async function cargarProfesoresCache() {
    const { data, error } = await client.from('profesores').select('*').order('nombre');
    if (!error && data) {
        allProfesoresCache = data;
    }
}

async function checkProfile() {
    const { data, error } = await client.from('profiles').select('rol, bonos').eq('id', currentUser.id).single();

    if (error) {
        console.error("Error perfil:", error);
        isAdmin = false;
        document.body.classList.remove('is-admin');
        return;
    }

    if (data) {
        userBonos = data.bonos || 0;
        animateValue("bonos-count", parseInt(document.getElementById('bonos-count').innerText), userBonos, 500);

        if (data.rol === 'admin') {
            isAdmin = true;
            document.body.classList.add('is-admin');
        } else {
            isAdmin = false;
            document.body.classList.remove('is-admin');
            const vUsuarios = document.getElementById('view-usuarios');
            if (!vUsuarios.classList.contains('hidden')) switchTab('horarios');
        }

        const alertBox = document.getElementById('no-bonos-alert');
        if (userBonos < 1 && !isAdmin) alertBox.classList.remove('hidden');
        else alertBox.classList.add('hidden');
    }
}

function animateValue(id, start, end, duration) {
    if (start === end) return;
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

// --- 4. CALENDARIO ---
function renderizarCalendario() {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();

    // Header
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;

    // Grid
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysInMonth = lastDay.getDate();

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Días del mes anterior
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const dayEl = crearDiaCalendario(day, true, false, false, null);
        dayEl.classList.add('other-month');
        grid.appendChild(dayEl);
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateKey = formatDateLocal(dateObj);
        const isToday = dateObj.getTime() === today.getTime();
        const isPast = dateObj < today;
        const hasClasses = allClasesCache.some(c => {
            const claseDate = formatDateLocal(new Date(c.fecha_inicio));
            return claseDate === dateKey;
        });
        const isSelected = selectedDate === dateKey;

        const dayEl = crearDiaCalendario(day, false, isToday, isPast, dateKey);
        if (hasClasses) dayEl.classList.add('has-classes');
        if (isSelected) dayEl.classList.add('selected');
        if (isPast) dayEl.classList.add('disabled');

        grid.appendChild(dayEl);
    }

    // Días del mes siguiente
    const totalCells = grid.children.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
        const dayEl = crearDiaCalendario(day, true, false, false, null);
        dayEl.classList.add('other-month');
        grid.appendChild(dayEl);
    }
}

function crearDiaCalendario(day, isOtherMonth, isToday, isPast, dateKey) {
    const div = document.createElement('div');
    div.className = 'calendar-day rounded-lg text-sm font-medium text-gray-700 bg-gray-50';
    div.textContent = day;

    if (isToday) div.classList.add('today');

    if (!isOtherMonth && !isPast && dateKey) {
        div.onclick = () => filtrarPorFecha(dateKey);
    }

    return div;
}

function cambiarMes(delta) {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + delta);
    renderizarCalendario();
}

function filtrarPorFecha(dateKey) {
    selectedDate = dateKey;
    renderizarCalendario();
    renderizarClases();
}

function limpiarFiltroFecha() {
    selectedDate = null;
    renderizarCalendario();
    renderizarClases();
}

// --- 5. HORARIOS (CLASES) ---
async function cargarHorarios() {
    const container = document.getElementById('schedule-container');
    container.innerHTML = `
<div class="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
<i class="ph-duotone ph-spinner animate-spin text-4xl text-q19-600"></i>
<span class="text-xs uppercase tracking-widest font-bold text-gray-500">Cargando clases...</span>
</div>`;

    const { data: clases, error: errClases } =
        await client.from('clases').select('*').order('fecha_inicio');

    const { data: reservas, error: errReservas } =
        await client.from('reservas').select('*');

    if (errClases || errReservas) {
        console.error('Error cargando datos', { errClases, errReservas });
        container.innerHTML = '';
        document.getElementById('empty-state').classList.remove('hidden');
        allClasesCache = [];
        return;
    }

    if (!clases || clases.length === 0) {
        container.innerHTML = '';
        document.getElementById('empty-state').classList.remove('hidden');
        allClasesCache = [];
        return;
    }
    document.getElementById('empty-state').classList.add('hidden');

    // Map por clase_id => [reservas]
    const reservasMap = {};
    (reservas || []).forEach(r => {
        if (!reservasMap[r.clase_id]) reservasMap[r.clase_id] = [];
        reservasMap[r.clase_id].push(r);
    });

    // Enriquecer clases con ocupadas y miReserva (solo confirmadas)
    clases.forEach(c => {
        const resClase = reservasMap[c.id] || [];

        // Ocupación real: SOLO confirmadas
        const confirmadas = resClase.filter(r => r.estado === 'confirmada');
        c.ocupadas = confirmadas.length;

        // Mi reserva activa: confirmada y del usuario actual
        c.miReserva = confirmadas.find(r => r.user_id === currentUser.id) || null;
    });

    allClasesCache = clases;
    renderizarCalendario();
    renderizarClases();
}

function renderizarClases() {
    const container = document.getElementById('schedule-container');

    // Obtener fecha actual (sin horas)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Filtrar clases (solo de hoy en adelante)
    let clasesAMostrar = allClasesCache.filter(c => {
        const fechaClase = new Date(c.fecha_inicio);
        fechaClase.setHours(0, 0, 0, 0);
        return fechaClase >= hoy;
    });

    if (selectedDate) {
        clasesAMostrar = clasesAMostrar.filter(c => {
            const claseDate = formatDateLocal(new Date(c.fecha_inicio));
            return claseDate === selectedDate;
        });
    }

    if (clasesAMostrar.length === 0) {
        container.innerHTML = `
        <div class="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <i class="ph-duotone ph-calendar-x text-5xl text-gray-300 mb-4"></i>
            <p class="text-gray-500 font-medium">No hay clases en esta fecha</p>
            <button onclick="limpiarFiltroFecha()" class="mt-4 text-q19-600 hover:underline text-sm font-bold">Ver todas</button>
        </div>`;
        return;
    }

    // Agrupar por fecha
    const grupos = {};
    clasesAMostrar.forEach(c => {
        const dateKey = formatDateLocal(new Date(c.fecha_inicio));
        if (!grupos[dateKey]) grupos[dateKey] = [];
        grupos[dateKey].push(c);
    });

    container.innerHTML = '';

    Object.keys(grupos).sort().forEach(dateKey => {
        const dateObj = new Date(dateKey);
        const diaNombre = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
        const diaNumero = dateObj.getDate();
        const mes = dateObj.toLocaleDateString('es-ES', { month: 'long' });

        const section = document.createElement('div');
        section.className = 'bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden';

        section.innerHTML = `
        <div class="bg-gradient-to-r from-gray-400 to-gray-200 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-baseline gap-2">
                <span class="brand-font text-xl font-bold text-gray-800 capitalize">${diaNombre}</span>
                <span class="text-xs font-semibold text-gold-600 bg-gold-50 px-2 py-0.5 rounded-md border border-gold-100">${diaNumero} ${mes}</span>
            </div>
        </div>
        <div id="grid-${dateKey}" class="divide-y divide-gray-50"></div>
    `;
        container.appendChild(section);

        const grid = section.querySelector(`#grid-${dateKey}`);

        grupos[dateKey].forEach(c => {
            const hora = new Date(c.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            const isPilates = c.nombre.toLowerCase().includes('pilates') || c.nombre.toLowerCase().includes('reformer');
            const isHot = c.nombre.toLowerCase().includes('hot') || c.nombre.toLowerCase().includes('bikram');

            let iconColorClass = 'bg-sky-50 text-sky-600 border-sky-100';
            let tipoTexto = 'Yoga';

            if (isPilates) {
                iconColorClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                tipoTexto = 'Reformer';
            } else if (isHot) {
                iconColorClass = 'bg-rose-50 text-rose-600 border-rose-100';
                tipoTexto = 'Hot';
            }

            const llena = c.ocupadas >= c.capacidad_max;
            const reservada = !!c.miReserva;

            let btnAction = '';
            if (reservada) {
                btnAction = `
                <button onclick="cancelar(${c.miReserva.id})" class="group flex items-center gap-2 text-[11px] font-bold text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 bg-white px-4 py-2 rounded-full transition shadow-sm">
                    <i class="ph-bold ph-x group-hover:scale-110 transition"></i> CANCELAR
                </button>`;
            } else if (llena) {
                btnAction = `<span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-2 rounded-full uppercase tracking-wide border border-gray-200 cursor-not-allowed">Completa</span>`;
            } else {
                const disabledClass = (userBonos < 1 && !isAdmin) ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-lg hover:brightness-110 active:scale-95';
                const btnText = (userBonos < 1 && !isAdmin) ? '0 Bonos' : 'RESERVAR';

                btnAction = `
                <button onclick="reservar(${c.id})" class="bg-gradient-to-r from-q19-700 via-q19-600 to-q19-500 text-white text-[11px] font-bold px-6 py-2 rounded-full shadow-md transition transform ${disabledClass}">
                    ${btnText}
                </button>`;
            }

            const adminTrash = `<button onclick="borrarClase(${c.id})" class="admin-only hidden text-gray-300 hover:text-red-500 transition ml-2 p-1" title="Eliminar Clase"><i class="ph-bold ph-trash"></i></button>`;

            const row = document.createElement('div');
            row.className = 'p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition duration-300 group';

            row.innerHTML = `
            <div class="flex items-start gap-4 w-full">
                <div class="flex flex-col items-center justify-center w-14 h-14 rounded-xl ${iconColorClass} border shadow-sm flex-shrink-0">
                    <span class="text-[9px] font-bold opacity-80 uppercase pb-0.5">${tipoTexto}</span>
                    <span class="text-base font-black tracking-tight leading-none">${hora}</span>
                </div>
                
                <div class="flex-grow">
                    <div class="flex items-start justify-between">
                        <h4 class="brand-font font-bold text-lg text-gray-800 group-hover:text-q19-700 transition leading-tight">
                            ${c.nombre}
                            ${adminTrash}
                        </h4>
                    </div>
                    
                    <div class="flex items-center gap-2 mt-2">
                        <div class="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-md shadow-sm" title="Aforo">
                            <i class="ph-bold ph-users text-gray-300 text-sm"></i>
                            <span class="font-bold text-gray-700">${c.ocupadas}</span>
                            <span class="text-gray-300 text-[10px]">/ ${c.capacidad_max}</span>
                        </div>
                        ${reservada ? '<span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wide flex items-center gap-1"><i class="ph-fill ph-check-circle"></i> Tu Plaza</span>' : ''}
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-end sm:min-w-[120px]">
                ${btnAction}
            </div>
        `;
            grid.appendChild(row);
        });
    });
}

// --- 6. LOGICA RESERVAS ---
async function reservar(claseId) {
    if (userBonos < 1 && !isAdmin) return Swal.fire({
        icon: 'warning',
        title: 'Sin bonos',
        text: 'Necesitas adquirir un bono para reservar.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#d4af37'
    });

    const { error } = await client.rpc('reservar_con_bono', {
        p_clase_id: claseId,
        p_user_id: currentUser.id
    });

    if (error) {
        Swal.fire({ icon: 'error', title: 'Error al reservar', text: error.message });
    } else {
        Swal.fire({
            icon: 'success',
            title: '¡Reserva Confirmada!',
            text: 'Te esperamos en clase.',
            showConfirmButton: false,
            timer: 1500,
            backdrop: `rgba(0,0,0,0.4)`
        });
        await checkProfile();
        await cargarHorarios();
        if (isAdmin) await cargarAsistenciasPorClase();
    }
}

async function cancelar(reservaId) {
    const res = await Swal.fire({
        title: '¿Cancelar reserva?',
        text: "Se te devolverá el bono a tu cuenta.",
        icon: 'warning',
        iconColor: '#d4af37',
        showCancelButton: true,
        confirmButtonColor: '#374151',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Sí, cancelar'
    });

    if (res.isConfirmed) {
        const { error } = await client.rpc('cancelar_con_bono', { p_reserva_id: reservaId });
        if (error) Swal.fire('Error', error.message, 'error');
        else {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            Toast.fire({ icon: 'info', title: 'Reserva cancelada. Bono devuelto.' });
            await checkProfile();
            await cargarHorarios();
            if (isAdmin) await cargarAsistenciasPorClase();
        }
    }
}

// --- 7. GESTIÓN ADMIN ---

async function switchTab(tabName) {
    const tHorarios = document.getElementById('tab-horarios');
    const tAsistencias = document.getElementById('tab-asistencias');
    const tUsuarios = document.getElementById('tab-usuarios');
    const tConfiguracion = document.getElementById('tab-configuracion');
    const tAdminProfesores = document.getElementById('tab-admin-profesores');

    const vHorarios = document.getElementById('view-horarios');
    const vAsistencias = document.getElementById('view-asistencias');
    const vUsuarios = document.getElementById('view-usuarios');
    const vConfiguracion = document.getElementById('view-configuracion');
    const vAdminProfesores = document.getElementById('view-admin-profesores');

    // Ocultar todas las vistas
    vHorarios.classList.add('hidden');
    vAsistencias.classList.add('hidden');
    vUsuarios.classList.add('hidden');
    vConfiguracion.classList.add('hidden');
    if (vAdminProfesores) vAdminProfesores.classList.add('hidden');

    // Reset todos los tabs
    [tHorarios, tAsistencias, tUsuarios, tConfiguracion, tAdminProfesores].forEach(tab => {
        if (tab) {
            tab.classList.add('border-transparent', 'text-gray-400');
            tab.classList.remove('border-gold-500', 'bg-gray-800', 'text-white');
        }
    });

    // Activar el tab seleccionado
    if (tabName === 'horarios') {
        vHorarios.classList.remove('hidden');
        tHorarios.classList.add('border-gold-500', 'bg-gray-800', 'text-white');
        tHorarios.classList.remove('border-transparent', 'text-gray-400');
    } else if (tabName === 'asistencias') {
        vAsistencias.classList.remove('hidden');
        tAsistencias.classList.add('border-gold-500', 'bg-gray-800', 'text-white');
        tAsistencias.classList.remove('border-transparent', 'text-gray-400');
        await cargarAsistenciasPorClase();
    } else if (tabName === 'usuarios') {
        vUsuarios.classList.remove('hidden');
        tUsuarios.classList.add('border-gold-500', 'bg-gray-800', 'text-white');
        tUsuarios.classList.remove('border-transparent', 'text-gray-400');
        await cargarUsuariosAdmin();
    } else if (tabName === 'configuracion') {
        vConfiguracion.classList.remove('hidden');
        tConfiguracion.classList.add('border-gold-500', 'bg-gray-800', 'text-white');
        tConfiguracion.classList.remove('border-transparent', 'text-gray-400');
        await cargarConfiguracion();
    } else if (tabName === 'admin-profesores') {
        if (vAdminProfesores) vAdminProfesores.classList.remove('hidden');
        if (tAdminProfesores) {
            tAdminProfesores.classList.add('border-gold-500', 'bg-gray-800', 'text-white');
            tAdminProfesores.classList.remove('border-transparent', 'text-gray-400');
        }
        await cargarProfesoresAdmin();
    }
}

// NUEVO: cargar alumnos por clase
async function cargarAsistenciasPorClase() {
    const cont = document.getElementById('asistencias-container');
    const empty = document.getElementById('asistencias-empty');

    cont.innerHTML = `
    <div class="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
        <i class="ph-duotone ph-spinner animate-spin text-4xl text-q19-600"></i>
        <span class="text-xs uppercase tracking-widest font-bold text-gray-400">Cargando asistencias...</span>
    </div>`;

    // Obtener clases + reservas + profiles
    const { data: clases, error: errClases } = await client.from('clases').select('*').order('fecha_inicio');
    if (errClases) {
        console.error(errClases);
        cont.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    const { data: reservas, error: errRes } = await client.from('reservas').select('*');
    if (errRes) {
        console.error(errRes);
        cont.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    const { data: perfiles, error: errPerfiles } = await client.from('profiles').select('id, nombre, apellidos, fecha_nacimiento, email');
    if (errPerfiles) {
        console.error(errPerfiles);
        cont.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    if (!clases || clases.length === 0) {
        cont.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');

    const perfilesMap = {};
    (perfiles || []).forEach(p => { perfilesMap[p.id] = p; });

    // Mapear reservas por clase
    const reservasPorClase = {};
    (reservas || []).forEach(r => {
        if (!reservasPorClase[r.clase_id]) reservasPorClase[r.clase_id] = [];
        reservasPorClase[r.clase_id].push(r);
    });

    cont.innerHTML = '';

    // Agrupar clases futuras por fecha para que quede más legible
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const clasesFuturas = clases.filter(c => {
        const d = new Date(c.fecha_inicio);
        d.setHours(0, 0, 0, 0);
        return d >= hoy;
    });

    if (clasesFuturas.length === 0) {
        cont.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    const grupos = {};
    clasesFuturas.forEach(c => {
        const dateKey = formatDateLocal(new Date(c.fecha_inicio));
        if (!grupos[dateKey]) grupos[dateKey] = [];
        grupos[dateKey].push(c);
    });

    Object.keys(grupos).sort().forEach(dateKey => {
        const dateObj = new Date(dateKey);
        const diaNombre = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
        const diaNumero = dateObj.getDate();
        const mes = dateObj.toLocaleDateString('es-ES', { month: 'long' });

        const card = document.createElement('div');
        card.className = 'bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden';

        card.innerHTML = `
        <div class="bg-gradient-to-r from-gray-400 to-gray-200 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div class="flex items-baseline gap-2">
                <span class="brand-font text-xl font-bold text-gray-800 capitalize">${diaNombre}</span>
                <span class="text-xs font-semibold text-gold-600 bg-gold-50 px-2 py-0.5 rounded-md border border-gold-100">${diaNumero} ${mes}</span>
            </div>
        </div>
        <div class="divide-y divide-y-2 divide-gray-500" id="asistencias-grid-${dateKey}"></div>
    `;

        cont.appendChild(card);

        const grid = card.querySelector(`#asistencias-grid-${dateKey}`);

        grupos[dateKey].forEach(c => {
            const hora = new Date(c.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const listadoReservas = reservasPorClase[c.id] || [];
            const totalReservas = listadoReservas.length;

            const fila = document.createElement('div');
            fila.className = 'p-5 flex flex-col gap-4';

            // Cabecera clase + contador
            let alumnosHTML = '';

            if (totalReservas === 0) {
                alumnosHTML = `
                <div class="px-4 py-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400 flex items-center gap-2">
                    <i class="ph-duotone ph-user-circle text-xl"></i>
                    <span>Sin alumnos apuntados todavía.</span>
                </div>`;
            } else {
                alumnosHTML = `
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                    ${listadoReservas.map(r => {
                    const perfil = perfilesMap[r.user_id] || {};
                    const nombre = perfil.nombre || '';
                    const apellidos = perfil.apellidos || '';
                    const email = perfil.email || 'Sin email';
                    const displayEmail = email.length > 20 ? email.substring(0, 18) + '...' : email;

                    const iniciales = (nombre ? nombre[0] : (email[0] || '?')).toUpperCase();
                    const clasesAnt = perfil.clases_mes_anterior || 0;
                    const nivel = getRankConfig(clasesAnt);

                    return `
                        <div class="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-gold-300 transition group relative overflow-hidden">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 text-gray-500 font-bold text-sm border border-gray-200 shadow-sm group-hover:scale-105 transition relative z-10">
                                ${iniciales}
                                <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${nivel.color.replace('text-', 'bg-')}" title="${nivel.name}"></div>
                            </div>
                            <div class="flex flex-col z-10 w-full overflow-hidden">
                                <span class="text-sm font-bold text-gray-900 truncate" title="${nombre} ${apellidos}">${nombre} ${apellidos}</span>
                                <span class="text-[10px] text-gray-400 truncate" title="${email}">${displayEmail}</span>
                            </div>
                        </div>`;
                }).join('')}
                </div>`;
            }

            fila.innerHTML = `
            <div class="flex flex-col gap-4">
                <!-- Header Row: Time + Info -->
                <div class="flex items-start sm:items-center gap-4">
                    <!-- Time Box -->
                    <div class="flex flex-col items-center justify-center bg-gray-900 text-white w-14 h-14 rounded-2xl shadow-md border border-gray-800 shrink-0 z-10 relative overflow-hidden group">
                        <div class="absolute inset-0 bg-gold-500/10 opacity-0 group-hover:opacity-100 transition"></div>
                        <i class="ph-fill ph-clock text-gold-400 text-base"></i>
                        <span class="text-xs font-bold font-mono mt-0.5 tracking-wide">${hora}</span>
                    </div>
                    
                    <!-- Title & Badges -->
                    <div class="flex-grow pt-1 sm:pt-0">
                        <h4 class="brand-font text-lg font-bold text-gray-900 leading-tight">${c.nombre}</h4>
                        <div class="flex flex-wrap items-center gap-2 mt-1.5">
                                <span class="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-lg shadow-sm">
                                <i class="ph-bold ph-users text-gray-400"></i> ${totalReservas} / ${c.capacidad_max}
                                </span>
                                ${totalReservas >= c.capacidad_max ? '<span class="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-lg uppercase tracking-wide flex items-center gap-1"><i class="ph-bold ph-warning-circle"></i> Completa</span>' : ''}
                        </div>
                    </div>
                </div>

                <!-- Content (Students) -->
                <div class="pl-0 sm:pl-[4.5rem]">
                    ${alumnosHTML}
                </div>
            </div>
        `;

            grid.appendChild(fila);
        });
    });
}
// --- 8. GESTIÓN USUARIOS ADMIN ---
async function cargarUsuariosAdmin() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-400 italic"><i class="ph-duotone ph-spinner animate-spin"></i> Cargando...</td></tr>';

    const { data: users, error } = await client.from('profiles').select('*').order('email');

    if (error) return Swal.fire('Error Admin', 'Fallo al cargar usuarios.', 'error');

    allUsersCache = users;
    renderUsersTable(users);
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-table-body');
    const noRes = document.getElementById('no-users-found');

    tbody.innerHTML = '';

    if (!users || users.length === 0) {
        noRes.classList.remove('hidden');
        return;
    }
    noRes.classList.add('hidden');

    // Asegurar cabecera correcta (inyectar columna si falta)
    const headerRow = document.querySelector('#view-usuarios thead tr');
    if (headerRow && headerRow.children.length === 4) {
        const th = document.createElement('th');
        th.className = "px-6 py-4 text-center";
        th.innerText = "Nivel / Dto";
        headerRow.insertBefore(th, headerRow.children[2]);
    }

    users.forEach(u => {
        const isAdminRow = u.rol === 'admin';
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition border-b border-gray-50 last:border-0';

        const roleBadge = isAdminRow
            ? '<span class="bg-gray-900 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border border-gray-800">Admin</span>'
            : '<span class="bg-gray-100 text-gray-400 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border border-gray-200">Cliente</span>';

        // Calcular Nivel Anterior
        const clasesAnt = u.clases_mes_anterior || 0;
        const levelData = getRankConfig(clasesAnt);
        const discountText = levelData.discount > 0 ? `-${levelData.discount}%` : '0%';
        const discountClass = levelData.discount > 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-gray-400 bg-gray-100 border-gray-200';

        row.innerHTML = `
        <td class="px-6 py-4">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isAdminRow ? 'bg-gold-100 text-gold-700' : 'bg-gray-200 text-gray-500'}">
                    ${u.email ? u.email.charAt(0).toUpperCase() : '?'}
                </div>
                <div class="flex flex-col">
                    <span class="font-medium text-gray-700 truncate max-w-[140px] sm:max-w-none">${u.email || 'Anon'}</span>
                    <span class="text-[10px] text-gray-400">${u.nombre || ''} ${u.apellidos || ''}</span>
                </div>
            </div>
        </td>
        <td class="px-6 py-4 text-center">${roleBadge}</td>
        <td class="px-6 py-4 text-center">
            <div class="flex flex-col items-center">
                <span class="text-[10px] font-bold uppercase tracking-wide ${levelData.color}">${levelData.name}</span>
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full border ${discountClass} mt-0.5">${discountText}</span>
            </div>
        </td>
        <td class="px-6 py-4 text-center">
            <span class="font-bold text-lg ${u.bonos > 0 ? 'text-q19-600' : 'text-gray-300'}">${u.bonos || 0}</span>
        </td>
        <td class="px-6 py-4 text-right">
            <div class="flex justify-end items-center gap-2">
                <button onclick="sumarBono('${u.id}', -1)" class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition" title="Restar"><i class="ph-bold ph-minus"></i></button>
                
                <button onclick="sumarBono('${u.id}', 1)" class="px-3 h-8 flex items-center gap-1 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-black transition shadow-sm">
                    <i class="ph-bold ph-plus"></i> 1
                </button>
                
                <button onclick="sumarBono('${u.id}', 5)" class="px-3 h-8 flex items-center gap-1 rounded-lg bg-gold-500 text-white text-xs font-bold hover:bg-gold-600 transition shadow-sm" title="Pack 5">
                    <i class="ph-bold ph-ticket"></i> +5
                </button>
            </div>
        </td>
    `;
        tbody.appendChild(row);
    });
}

// --- LOGICA PROFESORES ADMIN ---
async function cargarProfesoresAdmin() {
    const grid = document.getElementById('admin-profesores-grid');
    const noData = document.getElementById('no-profesores');
    grid.innerHTML = '';

    // Usamos caché si existe o recargamos
    await cargarProfesoresCache();

    if (!allProfesoresCache || allProfesoresCache.length === 0) {
        noData.classList.remove('hidden');
        return;
    }
    noData.classList.add('hidden');

    grid.innerHTML = allProfesoresCache.map(p => `
        <div class="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition group">
            <div class="relative h-48 bg-gray-100 overflow-hidden">
                 <img src="${p.foto_url || 'https://via.placeholder.com/400x300?text=No+Foto'}" 
                      alt="${p.nombre}" 
                      class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                 <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                 <div class="absolute bottom-4 left-4 right-4">
                    <h3 class="text-white font-bold text-xl drop-shadow-md">${p.nombre}</h3>
                    <p class="text-white/90 text-sm font-medium drop-shadow-sm">${p.especialidad || 'Instructor'}</p>
                 </div>
            </div>
            <div class="p-6 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full border border-gray-100 shadow-sm" style="background-color: ${p.color || '#2d8a8e'}"></div>
                    <span class="text-xs text-gray-400 font-mono uppercase tracking-wider">ID: ${p.id}</span>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="editarProfesor(${p.id})" 
                        class="w-10 h-10 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition flex items-center justify-center"
                        title="Editar Profesor">
                        <i class="ph-bold ph-pencil-simple text-lg"></i>
                    </button>
                    <button onclick="borrarProfesor(${p.id})" 
                        class="w-10 h-10 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 transition flex items-center justify-center"
                        title="Eliminar Profesor">
                        <i class="ph-bold ph-trash text-lg"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function nuevoProfesor() {
    const { value: formValues } = await Swal.fire({
        title: 'Nuevo Profesor',
        html: `
            <div class="space-y-4 text-left">
                <div>
                    <label class="text-xs font-bold uppercase text-gray-500 block mb-1">Nombre</label>
                    <input id="swal-prof-nombre" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-q19-500 outline-none" placeholder="Ej: Ana García">
                </div>
                <div>
                    <label class="text-xs font-bold uppercase text-gray-500 block mb-1">Especialidad</label>
                    <input id="swal-prof-especialidad" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-q19-500 outline-none" placeholder="Ej: Vinyasa Yoga">
                </div>
                <div>
                    <label class="text-xs font-bold uppercase text-gray-500 block mb-1">URL Foto</label>
                    <input id="swal-prof-foto" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-q19-500 outline-none" placeholder="https://...">
                </div>
                <div>
                    <label class="text-xs font-bold uppercase text-gray-500 block mb-1">Color Identificativo</label>
                    <input id="swal-prof-color" type="color" class="w-full h-10 rounded cursor-pointer border border-gray-200" value="#2d8a8e">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Crear',
        confirmButtonColor: '#1a4d4f',
        preConfirm: () => {
            return {
                nombre: document.getElementById('swal-prof-nombre').value,
                especialidad: document.getElementById('swal-prof-especialidad').value,
                foto_url: document.getElementById('swal-prof-foto').value,
                color: document.getElementById('swal-prof-color').value
            }
        }
    });

    if (formValues) {
        if (!formValues.nombre) return Swal.fire('Error', 'El nombre es obligatorio', 'error');

        const { error } = await client.from('profesores').insert([formValues]);
        if (error) Swal.fire('Error', error.message, 'error');
        else {
            Swal.fire({
                icon: 'success',
                title: 'Profesor añadido',
                showConfirmButton: false,
                timer: 1500
            });
            await cargarProfesoresCache();
            cargarProfesoresAdmin();
        }
    }
}

async function editarProfesor(id) {
    const profesor = allProfesoresCache.find(p => p.id === id);
    if (!profesor) return;

    const { value: formValues } = await Swal.fire({
        title: 'Editar Profesor',
        html: `
            <div class="space-y-4 text-left">
                <div>
                    <label class="text-xs font-bold uppercase text-gray-500 block mb-1">Nombre</label>
                    <input id="swal-prof-nombre" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-q19-500 outline-none" value="${profesor.nombre || ''}">
                </div>
                <div>
                    <label class="text-xs font-bold uppercase text-gray-500 block mb-1">Especialidad</label>
                    <input id="swal-prof-especialidad" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-q19-500 outline-none" value="${profesor.especialidad || ''}">
                </div>
                <div>
                    <label class="text-xs font-bold uppercase text-gray-500 block mb-1">URL Foto</label>
                    <input id="swal-prof-foto" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-q19-500 outline-none" value="${profesor.foto_url || ''}">
                </div>
                <div>
                    <label class="text-xs font-bold uppercase text-gray-500 block mb-1">Color Identificativo</label>
                    <input id="swal-prof-color" type="color" class="w-full h-10 rounded cursor-pointer border border-gray-200" value="${profesor.color || '#2d8a8e'}">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        confirmButtonColor: '#1a4d4f',
        preConfirm: () => {
            return {
                nombre: document.getElementById('swal-prof-nombre').value,
                especialidad: document.getElementById('swal-prof-especialidad').value,
                foto_url: document.getElementById('swal-prof-foto').value,
                color: document.getElementById('swal-prof-color').value
            }
        }
    });

    if (formValues) {
        if (!formValues.nombre) return Swal.fire('Error', 'El nombre es obligatorio', 'error');

        const { error } = await client.from('profesores').update(formValues).eq('id', id);
        if (error) Swal.fire('Error', error.message, 'error');
        else {
            Swal.fire({
                icon: 'success',
                title: 'Profesor actualizado',
                showConfirmButton: false,
                timer: 1500
            });
            await cargarProfesoresCache();
            cargarProfesoresAdmin();
        }
    }
}

async function borrarProfesor(id) {
    const res = await Swal.fire({
        title: '¿Eliminar profesor?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar'
    });

    if (res.isConfirmed) {
        const { error } = await client.from('profesores').delete().eq('id', id);
        if (error) Swal.fire('Error', error.message, 'error');
        else {
            await cargarProfesoresCache();
            cargarProfesoresAdmin();
            Swal.fire('Eliminado', 'El profesor ha sido eliminado.', 'success');
        }
    }
}

function filtrarUsuarios() {
    const term = document.getElementById('user-search').value.toLowerCase();
    const filtered = allUsersCache.filter(u => u.email && u.email.toLowerCase().includes(term));
    renderUsersTable(filtered);
}

async function sumarBono(userId, qty) {
    const { data } = await client.from('profiles').select('bonos').eq('id', userId).single();
    const nuevoSaldo = (data.bonos || 0) + qty;

    const { error } = await client.from('profiles').update({ bonos: nuevoSaldo }).eq('id', userId);

    if (error) Swal.fire('Error', error.message, 'error');
    else {
        const Toast = Swal.mixin({ toast: true, position: 'bottom-end', showConfirmButton: false, timer: 1000 });
        Toast.fire({ icon: 'success', title: 'Saldo actualizado' });
        cargarUsuariosAdmin();
    }
}

// --- 8. CREAR CLASE INDIVIDUAL ---
function abrirModalCrearClase() {
    const modal = document.getElementById('modal-crear-clase');
    modal.classList.remove('hidden');

    const hoy = new Date().toISOString().split('T')[0];

    if (datePickerInstance) {
        datePickerInstance.set('minDate', hoy);
        datePickerInstance.setDate(hoy);
    } else {
        document.getElementById('clase-fecha').value = hoy;
    }

    const ahora = new Date();
    const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    document.getElementById('clase-hora-inicio').value = horaActual;
}

function cerrarModalCrearClase() {
    const modal = document.getElementById('modal-crear-clase');
    modal.classList.add('hidden');
    document.getElementById('form-crear-clase').reset();
}

document.getElementById('form-crear-clase').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('clase-nombre').value;
    const fecha = document.getElementById('clase-fecha').value;
    const horaInicio = document.getElementById('clase-hora-inicio').value;
    const duracion = parseInt(document.getElementById('clase-duracion').value);
    const capacidad = parseInt(document.getElementById('clase-capacidad').value);

    const fechaInicio = new Date(`${fecha}T${horaInicio}`);
    const fechaFin = new Date(fechaInicio.getTime() + duracion * 60000);

    Swal.fire({
        title: 'Creando clase...',
        didOpen: () => Swal.showLoading()
    });

    const { data, error } = await client.from('clases').insert([{
        nombre: nombre,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        capacidad_max: capacidad
    }]).select();

    Swal.close();

    if (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error al crear clase',
            text: error.message,
            confirmButtonColor: '#1a4d4f'
        });
    } else {
        cerrarModalCrearClase();
        Swal.fire({
            icon: 'success',
            title: '¡Clase creada!',
            text: `${nombre} ha sido añadida al calendario.`,
            showConfirmButton: false,
            timer: 2000
        });
        await cargarHorarios();
        if (isAdmin) await cargarAsistenciasPorClase();
    }
});

document.getElementById('modal-crear-clase').addEventListener('click', (e) => {
    if (e.target.id === 'modal-crear-clase') {
        cerrarModalCrearClase();
    }
});

async function borrarClase(id) {
    const res = await Swal.fire({
        title: '¿Eliminar clase?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, borrar'
    });

    if (res.isConfirmed) {
        await client.from('clases').delete().eq('id', id);
        await cargarHorarios();
        if (isAdmin) await cargarAsistenciasPorClase();
    }
}

// --- 9. REALTIME ---
client.channel('public:db').on('postgres_changes', { event: '*', schema: 'public' }, async () => {
    if (currentUser) {
        await checkProfile();
        await cargarHorarios();
        if (isAdmin) await cargarAsistenciasPorClase();
    }
}).subscribe();

// --- 10. GESTIÓN DE CONFIGURACIÓN ---
async function cargarConfiguracion() {
    const container = document.getElementById('view-configuracion');

    // Mostrar loading
    container.innerHTML = `
    <div class="flex flex-col items-center justify-center py-20">
        <i class="ph-duotone ph-spinner animate-spin text-4xl text-q19-600 mb-4"></i>
        <p class="text-gray-400 text-sm">Cargando configuración...</p>
    </div>
`;

    const { data: configs, error } = await client.from('configuracion').select('*').order('clave');

    if (error) {
        console.error('Error:', error);
        return Swal.fire('Error', 'No se pudo cargar la configuración.', 'error');
    }

    allConfigCache = configs || [];

    // Agrupar por categoría
    const porCategoria = {};
    configs.forEach(config => {
        const info = CONFIG_INFO[config.clave] || {
            nombre: config.clave,
            descripcion: config.descripcion || 'Sin descripción',
            icono: 'ph-gear',
            categoria: 'Otros'
        };

        if (!porCategoria[info.categoria]) {
            porCategoria[info.categoria] = [];
        }

        porCategoria[info.categoria].push({ ...config, info });
    });

    // Renderizar vista mejorada
    container.innerHTML = `
    <div class="fade-in">
        <div class="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
            <div>
                <h2 class="text-3xl brand-font font-bold text-gray-900">Configuración del Sistema</h2>
                <p class="text-gray-500 mt-1">Ajusta los parámetros de funcionamiento de la aplicación</p>
            </div>
            <button onclick="agregarConfiguracion()" class="flex items-center gap-2 bg-q19-700 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 transition">
                <i class="ph-bold ph-plus-circle text-lg"></i> Nuevo Parámetro
            </button>
        </div>
        <div class="space-y-6">
            ${Object.keys(porCategoria).map(categoria => `
                <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div class="bg-gradient-to-r from-black to-gray-500 px-6 py-4 border-b border-gray-100">
                        <h3 class="font-bold text-lg text-white flex items-center gap-2">
                            <i class="ph-fill ph-folder text-q19-600"></i>
                            ${categoria}
                        </h3>
                    </div>
                    
                    <div class="divide-y-2 divide-gray-500">
                        ${porCategoria[categoria].map(config => renderConfigItem(config)).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
`;
}

function renderConfigItem(config) {
    const valor = config.valor;
    const info = config.info;

    // Renderizar según tipo
    let valorDisplay = '';
    if (info.tipo === 'booleano') {
        const isTrue = valor === 'true' || valor === true;
        valorDisplay = `
        <div class="flex items-center gap-2">
            <div class="relative inline-block w-12 h-6">
                <input type="checkbox" ${isTrue ? 'checked' : ''} 
                       onchange="actualizarConfigRapido('${config.id}', this.checked ? 'true' : 'false')"
                       class="sr-only peer">
                <div class="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 cursor-pointer"></div>
            </div>
            <span class="text-sm font-bold ${isTrue ? 'text-emerald-600' : 'text-gray-400'}">
                ${isTrue ? 'Activado' : 'Desactivado'}
            </span>
        </div>
    `;
    } else if (info.tipo === 'numero') {
        valorDisplay = `
        <div class="flex items-center gap-3">
            <input type="number" value="${valor}" 
                   onchange="actualizarConfigRapido('${config.id}', this.value)"
                   class="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-q19-500 outline-none text-center font-bold">
            <span class="text-sm text-gray-500">${info.unidad || ''}</span>
        </div>
    `;
    } else {
        valorDisplay = `
        <input type="text" value="${valor || ''}" 
               onchange="actualizarConfigRapido('${config.id}', this.value)"
               class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-q19-500 outline-none">
    `;
    }

    return `
    <div class="p-6 hover:bg-gray-50/50 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="flex items-start gap-4 flex-1">
            <div class="w-10 h-10 rounded-lg bg-q19-50 text-q19-600 flex items-center justify-center flex-shrink-0">
                <i class="${info.icono} text-xl"></i>
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-gray-800 mb-1">${info.nombre}</h4>
                <p class="text-sm text-gray-500 leading-relaxed">${info.descripcion}</p>
                <code class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded mt-2 inline-block">${config.clave}</code>
            </div>
        </div>
        
        <div class="flex items-center gap-3">
            ${valorDisplay}
            <button onclick="eliminarConfiguracion('${config.id}', '${config.clave}')" 
                    class="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition" 
                    title="Eliminar">
                <i class="ph-bold ph-trash"></i>
            </button>
        </div>
    </div>
`;
}

async function actualizarConfigRapido(id, nuevoValor) {
    const { error } = await client.from('configuracion')
        .update({ valor: nuevoValor })
        .eq('id', id);

    if (error) {
        Swal.fire('Error', error.message, 'error');
        cargarConfiguracion(); // Recargar para revertir
    } else {
        const Toast = Swal.mixin({
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 1500
        });
        Toast.fire({ icon: 'success', title: 'Configuración actualizada' });
    }
}

async function agregarConfiguracion() {
    const { value: formValues } = await Swal.fire({
        title: 'Nuevo Parámetro',
        html: `
        <div class="space-y-4 text-left">
            <div>
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Clave</label>
                <input id="config-clave" class="swal2-input w-full" placeholder="ej: max_reservas_dia">
            </div>
            <div>
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Valor</label>
                <input id="config-valor" class="swal2-input w-full" placeholder="ej: 3">
            </div>
            <div>
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Descripción</label>
                <textarea id="config-descripcion" class="swal2-textarea w-full" placeholder="Máximo de reservas por día para cada usuario"></textarea>
            </div>
        </div>
    `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#236c6f',
        preConfirm: () => {
            const clave = document.getElementById('config-clave').value;
            const valor = document.getElementById('config-valor').value;
            const descripcion = document.getElementById('config-descripcion').value;

            if (!clave) {
                Swal.showValidationMessage('La clave es obligatoria');
                return false;
            }

            return { clave, valor, descripcion };
        }
    });

    if (formValues) {
        const { error } = await client.from('configuracion').insert([formValues]);

        if (error) {
            Swal.fire('Error', error.message, 'error');
        } else {
            Swal.fire({
                icon: 'success',
                title: 'Parámetro creado',
                showConfirmButton: false,
                timer: 1500
            });
            cargarConfiguracion();
        }
    }
}

async function editarConfiguracion(id) {
    const config = allConfigCache.find(c => c.id === id);
    if (!config) return;

    const { value: formValues } = await Swal.fire({
        title: 'Editar Parámetro',
        html: `
        <div class="space-y-4 text-left">
            <div>
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Clave</label>
                <input id="config-clave" class="swal2-input w-full" value="${config.clave}">
            </div>
            <div>
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Valor</label>
                <input id="config-valor" class="swal2-input w-full" value="${config.valor || ''}">
            </div>
            <div>
                <label class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Descripción</label>
                <textarea id="config-descripcion" class="swal2-textarea w-full">${config.descripcion || ''}</textarea>
            </div>
        </div>
    `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#236c6f',
        preConfirm: () => {
            return {
                clave: document.getElementById('config-clave').value,
                valor: document.getElementById('config-valor').value,
                descripcion: document.getElementById('config-descripcion').value
            };
        }
    });

    if (formValues) {
        const { error } = await client.from('configuracion')
            .update(formValues)
            .eq('id', id);

        if (error) {
            Swal.fire('Error', error.message, 'error');
        } else {
            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                showConfirmButton: false,
                timer: 1500
            });
            cargarConfiguracion();
        }
    }
}

async function eliminarConfiguracion(id, clave) {
    const res = await Swal.fire({
        title: '¿Eliminar parámetro?',
        text: `Se eliminará la configuración: ${clave}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (res.isConfirmed) {
        const { error } = await client.from('configuracion').delete().eq('id', id);

        if (error) {
            Swal.fire('Error', error.message, 'error');
        } else {
            Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                showConfirmButton: false,
                timer: 1500
            });
            cargarConfiguracion();
        }
    }
}

// ================= PERFIL & RANGO V7 =================
function getRankConfig(count) {
    // URLs RAW github
    const images = {
        bronce: 'https://raw.githubusercontent.com/jaime312/Q19/main/images/ham_bronce.png',
        plata: 'https://raw.githubusercontent.com/jaime312/Q19/main/images/ham_plata.png',
        oro: 'https://raw.githubusercontent.com/jaime312/Q19/main/images/ham_oro.png',
        platino: 'https://raw.githubusercontent.com/jaime312/Q19/main/images/ham_platino.png',
        diamante: 'https://raw.githubusercontent.com/jaime312/Q19/main/images/ham_diamante.png'
    };

    // Colores Texto
    const colors = {
        bronce: 'text-amber-700',
        plata: 'text-gray-400',
        oro: 'text-yellow-500',
        platino: 'text-slate-500',
        diamante: 'text-blue-500'
    };

    let level = {};

    if (count > 16) {
        level = { name: 'Diamante', color: colors.diamante, img: images.diamante, discount: 20, min: 17, next: null, nextName: null };
    } else if (count >= 12) {
        level = { name: 'Platino', color: colors.platino, img: images.platino, discount: 15, min: 12, next: 17, nextName: 'Diamante' };
    } else if (count >= 7) {
        level = { name: 'Oro', color: colors.oro, img: images.oro, discount: 10, min: 7, next: 12, nextName: 'Platino' };
    } else if (count >= 3) {
        level = { name: 'Plata', color: colors.plata, img: images.plata, discount: 5, min: 3, next: 7, nextName: 'Oro' };
    } else {
        level = { name: 'Bronce', color: colors.bronce, img: images.bronce, discount: 0, min: 0, next: 3, nextName: 'Plata' };
    }
    return level;
}

function renderProfileCard(profile) {
    const wrapper = document.getElementById('profile-cards-wrapper');
    if (!wrapper) return;

    if (!profile) {
        wrapper.classList.add('hidden');
        return;
    }

    // Nombre completo
    const nombre = profile.nombre ?? '';
    const apellidos = profile.apellidos ?? '';
    const fullNameEl = document.getElementById('profile-nombre-full');
    if (fullNameEl) fullNameEl.textContent = `${nombre} ${apellidos}`.trim();

    // =========================
    // 1) NIVEL ACTUAL (Mes anterior)
    // =========================
    const countLastMonth = profile.clases_mes_anterior || 0;
    const currentLevel = getRankConfig(countLastMonth);

    const badgeCurrent = document.getElementById('rank-badge-current');
    if (badgeCurrent) badgeCurrent.src = currentLevel.img;

    const curNameEl = document.getElementById('current-rank-name');
    if (curNameEl) {
        curNameEl.textContent = currentLevel.name;
        curNameEl.className = `text-xs font-bold uppercase tracking-wider ${currentLevel.color}`;
    }

    // Badge descuento nivel actual
    const disc = document.getElementById('discount-badge');
    if (disc) {
        if ((currentLevel.discount || 0) > 0) {
            disc.textContent = `-${currentLevel.discount}% en Bonos`;
            disc.classList.remove('hidden');
        } else {
            disc.classList.add('hidden');
        }
    }

    // =========================
    // 2) PROGRESO (Mes actual) -> NIVEL MES SIGUIENTE
    // =========================
    const countThisMonth = profile.clases_completadas_mes || 0;
    const countEl = document.getElementById('clases-count-num');
    if (countEl) countEl.textContent = countThisMonth;

    const projectedLevel = getRankConfig(countThisMonth);

    const projNameEl = document.getElementById('projected-rank-name');
    if (projNameEl) {
        projNameEl.textContent = projectedLevel.name;
        projNameEl.className = `text-sm font-black uppercase tracking-widest ml-1 ${projectedLevel.color}`;
    }

    // Badge descuento nivel proyectado (mes siguiente)
    const projDisc = document.getElementById('projected-discount-badge');
    if (projDisc) {
        if ((projectedLevel.discount || 0) > 0) {
            projDisc.textContent = `-${projectedLevel.discount}% en Bonos`;
            projDisc.classList.remove('hidden');
        } else {
            projDisc.classList.add('hidden');
        }
    }

    // Barra progreso + texto “faltan X para …”
    const progressBar = document.getElementById('rank-progress-bar');
    const nextInfo = document.getElementById('next-level-info');

    if (projectedLevel.next) {
        const target = projectedLevel.next;
        const faltan = target - countThisMonth;
        const range = projectedLevel.next - projectedLevel.min;
        const doneInTier = countThisMonth - projectedLevel.min;

        const pct = range > 0 ? Math.min(100, Math.max(5, (doneInTier / range) * 100)) : 100;
        if (progressBar) progressBar.style.width = `${pct}%`;

        // Color para el nombre del siguiente nivel
        const nextLvlConfig = getRankConfig(target);
        if (nextInfo) {
            nextInfo.innerHTML =
                `Faltan ${faltan} para <span class="${nextLvlConfig.color}">${projectedLevel.nextName}</span>`;
        }
    } else {
        if (progressBar) progressBar.style.width = '100%';
        if (nextInfo) nextInfo.textContent = '¡Nivel Máximo!';
    }

    wrapper.classList.remove('hidden');
}

async function loadProfileCard() {
    try {
        if (!currentUser?.id) { renderProfileCard(null); return; }
        const { data } = await client
            .from('profiles')
            .select('nombre, apellidos, clases_completadas_mes, clases_mes_anterior')
            .eq('id', currentUser.id)
            .single();
        renderProfileCard(data);
    } catch (e) { renderProfileCard(null); }
}

async function abrirEditarPerfil() {
    const fullName = document.getElementById('profile-nombre-full').textContent.trim();
    const parts = fullName.split(' ');
    const currentNombre = parts[0] || '';
    const currentApellidos = parts.slice(1).join(' ') || '';

    const { value: formValues } = await Swal.fire({
        title: 'Editar Perfil',
        html: `
        <div class="flex flex-col gap-3 text-left">
            <div><label class="text-xs font-bold text-gray-500 uppercase">Nombre</label><input id="swal-nombre" class="swal-input-custom w-full px-4 py-2 border rounded-lg bg-gray-50" value="${currentNombre}"></div>
            <div><label class="text-xs font-bold text-gray-500 uppercase">Apellidos</label><input id="swal-apellidos" class="swal-input-custom w-full px-4 py-2 border rounded-lg bg-gray-50" value="${currentApellidos}"></div>
        </div>
    `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#d4af37',
        preConfirm: () => [document.getElementById('swal-nombre').value, document.getElementById('swal-apellidos').value]
    });

    if (formValues) {
        const [newNombre, newApellidos] = formValues;
        await client.from('profiles').update({ nombre: newNombre, apellidos: newApellidos }).eq('id', currentUser.id);
        loadProfileCard();
    }
}