// Variables de estado
let modoReimpresion = false;
let modoEdicion = false;
let currentRowId = null;
let accionPendientePassword = null;

// ==================== VALIDACIÓN DE CAMPOS OBLIGATORIOS ====================
const camposObligatorios = [
    'nombrePaciente',
    'rut',
    'intervencion1',
    'diagPre',
    'diagPost',
    'especialidadSelect',   // select
    'cirujano1',
    'anestesiologo',
    'tipoAnestesia',
    'modalidad',
    'pabellon',             // select
    'horaInicio',
    'horaTermino',
    'descripcion',
    'destino'               // Campo obligatorio añadido
];

function validarCamposObligatorios() {
    let faltantes = [];

    camposObligatorios.forEach(id => {
        const campo = document.getElementById(id);
        if (!campo) return;

        let valor = campo.value ? campo.value.trim() : '';

        // Para selects: verifica que no sea la opción vacía inicial
        if ((campo.tagName === 'SELECT' && (campo.selectedIndex === 0 && campo.options[0].value === '')) || valor === '') {
            const label = document.querySelector(`label[for="${id}"]`);
            const nombreCampo = label ? label.textContent.trim() : id;
            faltantes.push(nombreCampo);

            // Resaltar en rojo
            campo.style.borderColor = '#e74c3c';
            campo.style.backgroundColor = '#ffeaea';
        } else {
            // Quitar resaltado
            campo.style.borderColor = '';
            campo.style.backgroundColor = '';
        }
    });

    if (faltantes.length > 0) {
        alert(`⚠️ Los siguientes campos son obligatorios:\n\n• ${faltantes.join('\n• ')}\n\nPor favor complételos antes de continuar.`);
        return false;
    }
    return true;
}

// Inicialización
document.addEventListener('DOMContentLoaded', function () {
    cargarListas();
    document.getElementById('btnLogin').onclick = login;
    document.getElementById('btnGuardarImprimir').onclick = guardarImprimir;
    document.getElementById('btnEliminar').onclick = eliminarRegistro;
    document.getElementById('btnEditar').onclick = editarRegistro;
    document.getElementById('especialidadSelect').onchange = filtrarCirujanos;

    document.getElementById('rut').addEventListener('blur', formatearRUT);
    document.getElementById('rut').addEventListener('input', soloNumerosYK);
    document.getElementById('buscarRut').addEventListener('blur', formatearRutBusqueda);
    document.getElementById('buscarRut').addEventListener('input', soloNumerosYK);

    // Botón REIMPRIMIR
    const btnReimprimir = document.createElement('button');
    btnReimprimir.id = 'btnReimprimir';
    btnReimprimir.textContent = 'REIMPRIMIR';
    btnReimprimir.className = 'secondary';
    btnReimprimir.style.display = 'none';
    btnReimprimir.onclick = reimprimir;
    document.querySelector('.botones').appendChild(btnReimprimir);

    inicializarModalPassword();
});

// ==================== MODAL DE CONTRASEÑA ====================
function inicializarModalPassword() {
    const modal = document.getElementById('modalPassword');
    if (!modal) return;

    document.getElementById('btnCancelarPassword').onclick = function() {
        modal.style.display = 'none';
        accionPendientePassword = null;
    };

    document.getElementById('btnAceptarPassword').onclick = function() {
        const pass = document.getElementById('inputPasswordModal').value.trim();
        if (pass === "Administrador1234") {
            modal.style.display = 'none';
            document.getElementById('errorPasswordModal').textContent = '';
            if (accionPendientePassword) accionPendientePassword();
            accionPendientePassword = null;
        } else {
            document.getElementById('errorPasswordModal').textContent = "Contraseña incorrecta";
        }
        document.getElementById('inputPasswordModal').value = '';
    };

    document.getElementById('inputPasswordModal').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('btnAceptarPassword').click();
        }
    });
}

function mostrarModalPassword(callback) {
    accionPendientePassword = callback;
    document.getElementById('modalPassword').style.display = 'flex';
    document.getElementById('inputPasswordModal').value = '';
    document.getElementById('errorPasswordModal').textContent = '';
    document.getElementById('inputPasswordModal').focus();
}

// ==================== CARGAR LISTAS DESDE HOJA MAI ====================
async function cargarListas() {
    try {
        const url = 'https://script.google.com/macros/s/AKfycbw8RT55rxV6ArtbumqzU9hGimyOddR3dR7QjbNERpUkCRxZAChBC2V0WGRGM_7DH46-8w/exec';
        const response = await fetch(url + '?accion=listas');
        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        const listas = await response.json();

        // Datalists normales
        cargarDatalist('intervenciones', listas.intervenciones || []);
        cargarDatalist('anestesiologos', listas.anestesiologos || []);
        cargarDatalist('auxiliares', listas.auxiliaresdeanestesia || listas.auxanestesia || []);
        cargarDatalist('enfermeras', listas.enfermeras || []);
        cargarDatalist('arsenaleras', listas.arsenaleras || []);
        cargarDatalist('pabelloneras', listas.pabelloneras || []);
        cargarDatalist('tiposAnestesia', listas.tiposanestesia || listas.tipodeanestesia || []);
        cargarDatalist('modalidades', listas.modalidades || []);
        cargarDatalist('diagnosticos', listas.diagnosticos || []);
        

        // Especialidades desde columna I
        const selectEsp = document.getElementById('especialidadSelect');
        selectEsp.innerHTML = '<option value="">Seleccionar especialidad</option>';
        (listas.especialidades || []).forEach(esp => {
            const opt = document.createElement('option');
            opt.value = esp.trim();
            opt.textContent = esp.trim();
            selectEsp.appendChild(opt);
        });

        // Cirujanos: columna J = nombre, columna K = especialidad del cirujano
        const cirujanosArray = [];
        const nombres = listas.cirujanos || [];
        const especialidadesCir = listas.especialidadcirujano || [];

        for (let i = 0; i < Math.max(nombres.length, especialidadesCir.length); i++) {
            const nombre = (nombres[i] || '').toString().trim();
            const esp = (especialidadesCir[i] || '').toString().trim();
            if (nombre && esp) {
                cirujanosArray.push({ nombre: nombre, especialidad: esp });
            }
        }

        window.cirujanos = cirujanosArray;
        console.log("Cirujanos cargados desde MAI:", window.cirujanos);

        filtrarCirujanos();

    } catch (error) {
        console.error("Error al cargar listas:", error);
        alert("No se pudieron cargar las listas desde Google Sheets. Verifique la hoja 'MAI', los encabezados y la conexión.");
    }
}

function cargarDatalist(id, array) {
    const dl = document.getElementById(id);
    dl.innerHTML = '';
    array.forEach(item => {
        if (item && item.toString().trim() !== '') {
            const opt = document.createElement('option');
            opt.value = item.toString().trim();
            dl.appendChild(opt);
        }
    });
}

// ==================== FILTRAR CIRUJANOS ====================
function filtrarCirujanos() {
    const especialidad = document.getElementById('especialidadSelect').value.trim();
    const datalist = document.getElementById('cirujanosFiltrados');
    datalist.innerHTML = '';

    if (!especialidad) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = "Seleccione especialidad primero";
        datalist.appendChild(opt);
        return;
    }

    if (!window.cirujanos || window.cirujanos.length === 0) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = "No hay cirujanos registrados";
        datalist.appendChild(opt);
        return;
    }

    const filtrados = window.cirujanos.filter(c => c.especialidad.trim() === especialidad);

    if (filtrados.length === 0) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = "No hay cirujanos para esta especialidad";
        datalist.appendChild(opt);
    } else {
        filtrados.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nombre;
            datalist.appendChild(opt);
        });
    }
}

// ==================== LOGIN ====================
function login() {
    const user = document.getElementById('usuario').value.trim();
    const pass = document.getElementById('password').value;

    if (user === "admin" && pass === "Administrador1234") {
        document.getElementById('login').classList.add('hidden');
        document.getElementById('formulario').classList.remove('hidden');
        cargarFechaHora();
        filtrarCirujanos();
        modoReimpresion = false;
        modoEdicion = false;
        actualizarBotones();
    } else {
        document.getElementById('error-login').textContent = "Usuario o contraseña incorrectos";
    }
}

// ==================== FECHA Y HORA ====================
function cargarFechaHora() {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const año = ahora.getFullYear();
    const hora = String(ahora.getHours()).padStart(2, '0');
    const min = String(ahora.getMinutes()).padStart(2, '0');
    document.getElementById('fechaHora').value = `${dia}/${mes}/${año} ${hora}:${min}`;
}

// ==================== FORMATO RUT ====================
function soloNumerosYK(e) {
    let val = e.target.value.replace(/[^0-9kK]/g, '');
    e.target.value = val.toUpperCase();
}

function formatearRUT() {
    let rut = document.getElementById('rut').value.replace(/[^0-9kK]/gi, '').toUpperCase();
    if (rut.length < 2) {
        document.getElementById('rut').value = '';
        return;
    }
    let dv = rut.slice(-1);
    let num = rut.slice(0, -1);
    if (num.length > 0) num = num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    document.getElementById('rut').value = num + '-' + dv;
}

function formatearRutBusqueda() {
    let rut = document.getElementById('buscarRut').value.replace(/[^0-9kK]/gi, '').toUpperCase();
    if (rut.length < 2) {
        document.getElementById('buscarRut').value = '';
        return;
    }
    let dv = rut.slice(-1);
    let num = rut.slice(0, -1);
    if (num.length > 0) num = num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    document.getElementById('buscarRut').value = num + '-' + dv;
}

// ==================== ELIMINAR Y EDITAR ====================
function eliminarRegistro() {
    if (!modoReimpresion || !currentRowId) {
        alert("Debe cargar un protocolo existente para eliminar.");
        return;
    }
    mostrarModalPassword(function() {
        if (confirm("¿Está seguro que desea eliminar este registro permanentemente?")) {
            eliminarRegistroEnSheets(currentRowId);
        }
    });
}

function editarRegistro() {
    if (!modoReimpresion || !currentRowId) {
        alert("Debe cargar un protocolo existente para editar.");
        return;
    }
    mostrarModalPassword(function() {
        modoEdicion = true;
        actualizarBotones();
        alert("Modo edición activado. Realice los cambios y use GUARDAR CAMBIOS / IMPRIMIR para actualizar.");
    });
}

async function eliminarRegistroEnSheets(rowId) {
    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbw8RT55rxV6ArtbumqzU9hGimyOddR3dR7QjbNERpUkCRxZAChBC2V0WGRGM_7DH46-8w/exec', {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accion: 'eliminar', rowId: rowId })
        });
        alert("Registro eliminado exitosamente.");
        limpiarFormulario();
    } catch (error) {
        alert("Error al eliminar el registro.");
        console.error(error);
    }
}

// ==================== GUARDAR E IMPRIMIR ====================
function guardarImprimir() {
    // VALIDACIÓN DE CAMPOS OBLIGATORIOS
    if (!validarCamposObligatorios()) {
        return;
    }

    if (modoReimpresion && !modoEdicion) {
        alert("Este protocolo ya fue guardado previamente. Use REIMPRIMIR si solo desea imprimir.");
        return;
    }

    const datos = obtenerDatosActuales();
    datos.accion = modoEdicion ? 'editar' : 'insertar';
    if (modoEdicion && currentRowId) {
        datos.rowId = currentRowId;
    }

    const printWindow = window.open('', '_blank', 'width=950,height=850,scrollbars=yes,resizable=yes');

    if (!printWindow) {
        alert("Por favor, permite las ventanas emergentes para este sitio.");
        return;
    }

    // Guardamos los datos completos (con accion y rowId) para que el popup los use
    window.datosParaGuardar = datos;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Protocolo Operatorio</title>
        <style>
            body { font-family: "Times New Roman", serif; font-size: 9.5pt; padding: 15px 20px; line-height: 1.35; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 14px; }
            .header img { height: 62px; }
            .header h1 { font-size: 21pt; margin:0; text-align:center; font-weight:bold; flex-grow:1; }
            .header .fecha { font-size: 10pt; white-space: nowrap; }
            h3 { font-size: 11.5pt; margin:12px 0 5px; border-bottom:1px solid #000; font-weight:bold; }
            table { width:100%; border-collapse:collapse; margin:5px 0; }
            td, th { padding:2px 4px; font-size:9.5pt; }
            .tabla-5col th { font-weight:bold; text-align:left; background:#f0f8f5; }
            .descripcion { text-align:justify; margin:8px 0 30px 0; border-bottom: 2px solid #000; padding-bottom: 15px; min-height:90px; }
            .firma { margin-top: 100px; text-align: center; display: none; }
            .firma-linea { border-top: 2px solid #000; width: 350px; margin: 20px auto 8px auto; padding-top: 8px; font-weight: bold; font-size: 11pt; }
            .botones-print { text-align:center; margin:60px 0 40px 0; padding:20px 0; }
            .botones-print button { padding:14px 40px; font-size:18pt; margin:0 30px; border-radius:10px; cursor:pointer; font-weight:bold; transition:all 0.3s ease; }
            .botones-print button:first-child { background:#00a94f; color:white; border:none; }
            .botones-print button:first-child:hover { background:#ffed00; color:#00a94f; transform:translateY(-4px); box-shadow:0 8px 20px rgba(0,169,79,0.4); }
            .botones-print button:last-child { background:white; color:#00a94f; border:3px solid #00a94f; }
            .botones-print button:last-child:hover { background:#f0f8f5; transform:translateY(-4px); box-shadow:0 8px 20px rgba(0,169,79,0.3); }
            @media print { .botones-print { display:none !important; } .firma { display:block !important; } }
        </style>
    </head>
    <body onload="alert('Revise cuidadosamente la información antes de imprimir.\\n\\nLos datos se guardarán automáticamente al hacer clic en IMPRIMIR.')">
        <div class="header">
            <img src="logo.png" alt="Logo">
            <h1>PROTOCOLO OPERATORIO</h1>
            <div class="fecha">${datos.fechaHora}</div>
        </div>

        <h3>1. Datos del Paciente</h3>
        <table><tr><td><strong>Nombre:</strong> ${datos.nombrePaciente} | <strong>RUT:</strong> ${datos.rut} | <strong>Edad:</strong> ${datos.edad} | <strong>Ficha:</strong> ${datos.ficha}</td></tr></table>

        <h3>2. Intervenciones Realizadas</h3>
        <table>
            <tr><td><strong>Principal:</strong> ${datos.intervencion1}</td></tr>
            ${datos.intervencion2 ? `<tr><td><strong>2da:</strong> ${datos.intervencion2}</td></tr>` : ''}
            ${datos.intervencion3 ? `<tr><td><strong>3ra:</strong> ${datos.intervencion3}</td></tr>` : ''}
            ${datos.intervencion4 ? `<tr><td><strong>4ta:</strong> ${datos.intervencion4}</td></tr>` : ''}
        </table>

        <h3>3. Diagnósticos</h3>
        <table>
            <tr><td><strong>Preoperatorio:</strong> ${datos.diagPre}</td></tr>
            <tr><td><strong>Postoperatorio:</strong> ${datos.diagPost}</td></tr>
        </table>

        <h3>4. Equipo Quirúrgico y Especificaciones</h3>
        <table class="tabla-5col">
            <tr><th>Especialidad</th><th>1er Cirujano</th><th>2do Cirujano</th><th>Anestesiólogo</th><th>Tipo Anestesia</th></tr>
            <tr><td>${datos.especialidad}</td><td>${datos.cirujano1}</td><td>${datos.cirujano2}</td><td>${datos.anestesiologo}</td><td>${datos.tipoAnestesia}</td></tr>
            <tr><th>3er Cirujano</th><th>4to Cirujano</th><th>Aux. Anestesia</th><th>Enfermera</th><th>Modalidad</th></tr>
            <tr><td>${datos.cirujano3}</td><td>${datos.cirujano4}</td><td>${datos.auxAnestesia}</td><td>${datos.enfermera}</td><td>${datos.modalidad}</td></tr>
            <tr><th>Arsenalera</th><th>Pabellonera</th><th>N° Pabellón</th><th>Hora Inicio</th><th>Hora Término</th></tr>
            <tr><td>${datos.arsenalera}</td><td>${datos.pabellonera}</td><td>${datos.pabellon}</td><td>${datos.horaInicio}</td><td>${datos.horaTermino}</td></tr>
            <tr><td colspan="2"><strong>Biopsia:</strong> ${datos.biopsia}</td><td colspan="3"><strong>Cultivo:</strong> ${datos.cultivo}</td></tr>
            <tr><td colspan="5"><strong>Destino del paciente:</strong> ${datos.destino || 'No especificado'}</td></tr>
        </table>

        <h3>5. Descripción de la Intervención</h3>
        <div class="descripcion">${datos.descripcion.replace(/\n/g, '<br>')}</div>

        <div class="firma">
            <div class="firma-linea">${datos.cirujano1 || '_________________________'}</div>
            <div>NOMBRE Y FIRMA DEL CIRUJANO RESPONSABLE</div>
        </div>

        <div class="botones-print">
            <button onclick="guardarEImprimir()">IMPRIMIR</button>
            <button onclick="window.close()">CANCELAR</button>
        </div>

        <script>
            function guardarEImprimir() {
                fetch('https://script.google.com/macros/s/AKfycbw8RT55rxV6ArtbumqzU9hGimyOddR3dR7QjbNERpUkCRxZAChBC2V0WGRGM_7DH46-8w/exec', {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(opener.datosParaGuardar)
                });
                window.print();
            }

            window.onafterprint = function() {
                if (opener && opener.postGuardarImprimir) {
                    opener.postGuardarImprimir();
                }
                window.close();
            };
        </script>
    </body>
    </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
}

function postGuardarImprimir() {
    if (modoEdicion) {
        alert("¡Cambios guardados exitosamente en Google Sheets!");
        modoEdicion = false;
        modoReimpresion = true;
        actualizarBotones();
    } else {
        setTimeout(() => {
            limpiarFormulario();
        }, 1000);
    }
}

function reimprimir() {
    const datos = obtenerDatosActuales();

    const printWindow = window.open('', '_blank', 'width=950,height=850,scrollbars=yes,resizable=yes');

    if (!printWindow) {
        alert("Por favor, permite las ventanas emergentes para este sitio.");
        return;
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Protocolo Operatorio</title>
        <style>
            body { font-family: "Times New Roman", serif; font-size: 9.5pt; padding: 15px 20px; line-height: 1.35; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 14px; }
            .header img { height: 62px; }
            .header h1 { font-size: 21pt; margin:0; text-align:center; font-weight:bold; flex-grow:1; }
            .header .fecha { font-size: 10pt; white-space: nowrap; }
            h3 { font-size: 11.5pt; margin:12px 0 5px; border-bottom:1px solid #000; font-weight:bold; }
            table { width:100%; border-collapse:collapse; margin:5px 0; }
            td, th { padding:2px 4px; font-size:9.5pt; }
            .tabla-5col th { font-weight:bold; text-align:left; background:#f0f8f5; }
            .descripcion { text-align:justify; margin:8px 0 30px 0; border-bottom: 2px solid #000; padding-bottom: 15px; min-height:90px; }
            .firma { margin-top: 100px; text-align: center; display: none; }
            .firma-linea { border-top: 2px solid #000; width: 350px; margin: 20px auto 8px auto; padding-top: 8px; font-weight: bold; font-size: 11pt; }
            @media print { .firma { display:block !important; } }
        </style>
    </head>
    <body onload="window.print()">
        <div class="header">
            <img src="logo.png" alt="Logo">
            <h1>PROTOCOLO OPERATORIO</h1>
            <div class="fecha">${datos.fechaHora}</div>
        </div>
        <h3>1. Datos del Paciente</h3>
        <table><tr><td><strong>Nombre:</strong> ${datos.nombrePaciente} | <strong>RUT:</strong> ${datos.rut} | <strong>Edad:</strong> ${datos.edad} | <strong>Ficha:</strong> ${datos.ficha}</td></tr></table>
        <h3>2. Intervenciones Realizadas</h3>
        <table>
            <tr><td><strong>Principal:</strong> ${datos.intervencion1}</td></tr>
            ${datos.intervencion2 ? `<tr><td><strong>2da:</strong> ${datos.intervencion2}</td></tr>` : ''}
            ${datos.intervencion3 ? `<tr><td><strong>3ra:</strong> ${datos.intervencion3}</td></tr>` : ''}
            ${datos.intervencion4 ? `<tr><td><strong>4ta:</strong> ${datos.intervencion4}</td></tr>` : ''}
        </table>
        <h3>3. Diagnósticos</h3>
        <table>
            <tr><td><strong>Preoperatorio:</strong> ${datos.diagPre}</td></tr>
            <tr><td><strong>Postoperatorio:</strong> ${datos.diagPost}</td></tr>
        </table>
        <h3>4. Equipo Quirúrgico y Especificaciones</h3>
        <table class="tabla-5col">
            <tr>
                <th>Especialidad</th><th>1er Cirujano</th><th>2do Cirujano</th><th>Anestesiólogo</th><th>Tipo Anestesia</th>
            </tr>
            <tr><td>${datos.especialidad}</td><td>${datos.cirujano1}</td><td>${datos.cirujano2}</td><td>${datos.anestesiologo}</td><td>${datos.tipoAnestesia}</td></tr>
            <tr>
                <th>3er Cirujano</th><th>4to Cirujano</th><th>Aux. Anestesia</th><th>Enfermera</th><th>Modalidad</th>
            </tr>
            <tr><td>${datos.cirujano3}</td><td>${datos.cirujano4}</td><td>${datos.auxAnestesia}</td><td>${datos.enfermera}</td><td>${datos.modalidad}</td></tr>
            <tr>
                <th>Arsenalera</th><th>Pabellonera</th><th>N° Pabellón</th><th>Hora Inicio</th><th>Hora Término</th>
            </tr>
            <tr><td>${datos.arsenalera}</td><td>${datos.pabellonera}</td><td>${datos.pabellon}</td><td>${datos.horaInicio}</td><td>${datos.horaTermino}</td></tr>
            <tr><td colspan="2"><strong>Biopsia:</strong> ${datos.biopsia}</td><td colspan="3"><strong>Cultivo:</strong> ${datos.cultivo}</td></tr>
            <tr><td colspan="5"><strong>Destino del paciente:</strong> ${datos.destino || 'No especificado'}</td></tr>

        </table>
        <h3>5. Descripción de la Intervención</h3>
        <div class="descripcion">${datos.descripcion.replace(/\n/g, '<br>')}</div>
        <div class="firma">
            <div class="firma-linea">${datos.cirujano1}</div>
            <div>NOMBRE Y FIRMA DEL CIRUJANO RESPONSABLE</div>
        </div>
        <script>
            window.onafterprint = function() {
                opener.limpiarFormulario();
                window.close();
            };
        </script>
    </body>
    </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
}

// ==================== OBTENER DATOS ====================
function obtenerDatosActuales() {
    return {
        fechaHora: document.getElementById('fechaHora').value,
        nombrePaciente: document.getElementById('nombrePaciente').value || 'No registrado',
        rut: document.getElementById('rut').value || 'No registrado',
        edad: document.getElementById('edad').value || 'No registrado',
        ficha: document.getElementById('ficha').value || 'No registrado',
        intervencion1: document.getElementById('intervencion1').value || 'No registrado',
        intervencion2: document.getElementById('intervencion2').value || '',
        intervencion3: document.getElementById('intervencion3').value || '',
        intervencion4: document.getElementById('intervencion4').value || '',
        diagPre: document.getElementById('diagPre').value || 'No registrado',
        diagPost: document.getElementById('diagPost').value || 'No registrado',
        especialidad: document.getElementById('especialidadSelect').options[document.getElementById('especialidadSelect').selectedIndex]?.text || 'No seleccionada',
        cirujano1: document.getElementById('cirujano1').value || 'No registrado',
        cirujano2: document.getElementById('cirujano2').value || 'No registrado',
        cirujano3: document.getElementById('cirujano3').value || 'No registrado',
        cirujano4: document.getElementById('cirujano4').value || 'No registrado',
        anestesiologo: document.getElementById('anestesiologo').value || 'No registrado',
        auxAnestesia: document.getElementById('auxAnestesia').value || 'No registrado',
        enfermera: document.getElementById('enfermera').value || 'No registrado',
        arsenalera: document.getElementById('arsenalera').value || 'No registrado',
        pabellonera: document.getElementById('pabellonera').value || 'No registrado',
        tipoAnestesia: document.getElementById('tipoAnestesia').value || 'No registrado',
        modalidad: document.getElementById('modalidad').value || 'No registrado',
        pabellon: document.getElementById('pabellon').value || 'No registrado',
        horaInicio: document.getElementById('horaInicio').value || '--:--',
        horaTermino: document.getElementById('horaTermino').value || '--:--',
        biopsia: document.getElementById('biopsia').value,
        cultivo: document.getElementById('cultivo').value,
        descripcion: document.getElementById('descripcion').value || 'Sin descripción',
        destino: document.getElementById('destino').value 
    };
}

// ==================== BÚSQUEDA ====================
document.getElementById('btnBuscar').onclick = buscarProtocolosAnteriores;

async function buscarProtocolosAnteriores() {
    let rutInput = document.getElementById('buscarRut').value.trim();
    if (!rutInput) {
        alert("Por favor ingrese un RUT para buscar.");
        return;
    }

    const rutLimpio = rutInput.replace(/[^0-9K]/gi, '').toUpperCase();

    if (rutLimpio.length < 8) {
        alert("Ingrese un RUT válido.");
        return;
    }

    limpiarFormulario();

    const resultadosDiv = document.getElementById('resultadosBusqueda');
    resultadosDiv.innerHTML = '<p>Buscando protocolos anteriores...</p>';

    try {
        const response = await fetch(`https://script.google.com/macros/s/AKfycbw8RT55rxV6ArtbumqzU9hGimyOddR3dR7QjbNERpUkCRxZAChBC2V0WGRGM_7DH46-8w/exec?accion=buscar&rut=${rutLimpio}`);
        const data = await response.json();

        if (data.status === "success" && data.protocolos && data.protocolos.length > 0) {
            data.protocolos.sort((a, b) => {
                let fechaA = parseFechaHora(a.fechaHora);
                let fechaB = parseFechaHora(b.fechaHora);
                return fechaB - fechaA;
            });

            let html = '<h3>Protocolos encontrados:</h3><ul style="list-style:none; padding-left:0;">';
            data.protocolos.forEach((proto, index) => {
                let fechaHoraTexto = formatearFechaHora(proto.fechaHora);

                const nombre = proto.nombrePaciente && proto.nombrePaciente.trim() !== '' ? proto.nombrePaciente.trim() : 'Sin nombre';
                const intervencion = proto.intervencion1 && proto.intervencion1.trim() !== '' ? proto.intervencion1.trim() : 'Sin intervención';
                const cirujano = proto.cirujano1 && proto.cirujano1.trim() !== '' ? proto.cirujano1.trim() : 'Sin cirujano';

                html += `
                <li style="padding:16px; margin:12px 0; background:#e8f5e8; border-left:6px solid #00a94f; border-radius:10px; cursor:pointer; box-shadow: 0 3px 10px rgba(0,0,0,0.12); transition: all 0.2s;" 
                    onclick="cargarProtocolo(${index})" 
                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(0,169,79,0.2)'" 
                    onmouseout="this.style.transform=''; this.style.boxShadow='0 3px 10px rgba(0,0,0,0.12)'">
                    <div style="font-size:15px; font-weight:bold; color:#00a94f;">${fechaHoraTexto}</div>
                    <div style="margin-top:6px;"><strong>Paciente:</strong> ${nombre}</div>
                    <div><strong>Intervención:</strong> ${intervencion}</div>
                    <div><strong>Cirujano principal:</strong> ${cirujano}</div>
                </li>`;
            });
            html += '</ul><p style="font-size:14px; color:#666; margin-top:20px;">Haga clic en un protocolo para cargarlo en el formulario.</p>';
            resultadosDiv.innerHTML = html;

            window.protocolosEncontrados = data.protocolos;
        } else {
            resultadosDiv.innerHTML = '<p style="color:#e67e22; font-weight:bold;">No se encontraron protocolos anteriores para este RUT.</p>';
            window.protocolosEncontrados = [];
        }
    } catch (error) {
        resultadosDiv.innerHTML = '<p style="color:red;">Error de conexión. Verifique su internet o intente más tarde.</p>';
        console.error("Error en búsqueda:", error);
    }
}

function parseFechaHora(fechaRaw) {
    if (!fechaRaw) return new Date(0);
    let str = fechaRaw.toString().trim();
    if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(str)) {
        const [fecha, hora] = str.split(' ');
        const [d, m, a] = fecha.split('/');
        const [h, min] = hora.split(':');
        return new Date(a, m-1, d, h, min);
    }
    return new Date(str);
}

function formatearFechaHora(fechaRaw) {
    if (!fechaRaw || fechaRaw.toString().trim() === '') return 'Sin fecha';
    let fecha = parseFechaHora(fechaRaw);
    if (isNaN(fecha.getTime())) return 'Sin fecha';
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const año = fecha.getFullYear();
    const hora = String(fecha.getHours()).padStart(2, '0');
    const min = String(fecha.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${año} ${hora}:${min}`;
}

function cargarProtocolo(index) {
    const proto = window.protocolosEncontrados[index];
    if (!proto) return;

    document.getElementById('fechaHora').value = formatearFechaHora(proto.fechaHora);
    document.getElementById('nombrePaciente').value = proto.nombrePaciente || '';
    
    let rutCargado = (proto.rut || '').toString().trim();
    if (rutCargado) {
        rutCargado = rutCargado.replace(/[\.\-\s]/g, '').toUpperCase();
        if (rutCargado.length >= 2) {
            let dv = rutCargado.slice(-1);
            let num = rutCargado.slice(0, -1);
            if (num.length > 0) num = num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            rutCargado = num + '-' + dv;
        }
    }
    document.getElementById('rut').value = rutCargado;

    document.getElementById('edad').value = proto.edad || '';
    document.getElementById('ficha').value = proto.ficha || '';
    
    document.getElementById('intervencion1').value = proto.intervencion1 || '';
    document.getElementById('intervencion2').value = proto.intervencion2 || '';
    document.getElementById('intervencion3').value = proto.intervencion3 || '';
    document.getElementById('intervencion4').value = proto.intervencion4 || '';
    
    document.getElementById('diagPre').value = proto.diagPre || '';
    document.getElementById('diagPost').value = proto.diagPost || '';
    document.getElementById('especialidadSelect').value = proto.especialidad || '';
    filtrarCirujanos();
    document.getElementById('cirujano1').value = proto.cirujano1 || '';
    document.getElementById('cirujano2').value = proto.cirujano2 || '';
    document.getElementById('cirujano3').value = proto.cirujano3 || '';
    document.getElementById('cirujano4').value = proto.cirujano4 || '';
    document.getElementById('anestesiologo').value = proto.anestesiologo || '';
    document.getElementById('auxAnestesia').value = proto.auxAnestesia || '';
    document.getElementById('enfermera').value = proto.enfermera || '';
    document.getElementById('arsenalera').value = proto.arsenalera || '';
    document.getElementById('pabellonera').value = proto.pabellonera || '';
    document.getElementById('tipoAnestesia').value = proto.tipoAnestesia || '';
    document.getElementById('modalidad').value = proto.modalidad || '';
    document.getElementById('pabellon').value = proto.pabellon || '';

    const formatHoraDesdeValor = (valor) => {
        if (!valor) return '';

        let horas, minutos;

        if (typeof valor === 'number') {
            const totalMinutos = Math.round(valor * 1440);
            horas = Math.floor(totalMinutos / 60);
            minutos = totalMinutos % 60;
        } else if (typeof valor === 'string') {
            if (valor.match(/^\d{1,2}:\d{2}$/)) {
                const [h, m] = valor.split(':');
                horas = parseInt(h, 10);
                minutos = parseInt(m, 10);
            } else if (valor.includes('T')) {
                const date = new Date(valor);
                if (!isNaN(date)) {
                    horas = date.getHours();
                    minutos = date.getMinutes();
                } else {
                    return '';
                }
            } else {
                return '';
            }
        } else {
            return '';
        }

        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    };

    document.getElementById('horaInicio').value = formatHoraDesdeValor(proto.horaInicio);
    document.getElementById('horaTermino').value = formatHoraDesdeValor(proto.horaTermino);

    document.getElementById('biopsia').value = proto.biopsia || 'NO';
    document.getElementById('cultivo').value = proto.cultivo || 'NO';
    document.getElementById('descripcion').value = proto.descripcion || '';
    document.getElementById('destino').value = proto.destino || '';

    modoReimpresion = true;
    modoEdicion = false;
    currentRowId = proto.rowId;
    actualizarBotones();

    document.getElementById('resultadosBusqueda').innerHTML = 
        `<p style="color:green; font-weight:bold;">
            Protocolo cargado correctamente: ${formatearFechaHora(proto.fechaHora)} - ${proto.nombrePaciente || 'Sin nombre'}
        </p>`;
}

// ==================== LIMPIAR Y BOTONES ====================
function limpiarFormulario() {
    document.querySelectorAll('input:not(#fechaHora), textarea, select').forEach(el => el.value = '');
    document.getElementById('especialidadSelect').value = '';
    filtrarCirujanos();
    cargarFechaHora();
    document.getElementById('resultadosBusqueda').innerHTML = '';
    modoReimpresion = false;
    modoEdicion = false;
    currentRowId = null;
    actualizarBotones();
}

function actualizarBotones() {
    const btnGuardar = document.getElementById('btnGuardarImprimir');
    const btnReimprimir = document.getElementById('btnReimprimir');
    const btnEditar = document.getElementById('btnEditar');
    const btnEliminar = document.getElementById('btnEliminar');

    if (modoReimpresion) {
        btnGuardar.disabled = true;
        btnGuardar.style.opacity = '0.5';
        btnGuardar.style.cursor = 'not-allowed';
        btnReimprimir.style.display = 'inline-block';
        btnEditar.style.display = 'inline-block';
        btnEliminar.style.display = 'inline-block';
    } else {
        btnGuardar.disabled = false;
        btnGuardar.style.opacity = '1';
        btnGuardar.style.cursor = 'pointer';
        btnReimprimir.style.display = 'none';
        btnEditar.style.display = 'inline-block';
        btnEliminar.style.display = 'inline-block';
    }

    if (modoEdicion) {
        btnGuardar.disabled = false;
        btnGuardar.style.opacity = '1';
        btnGuardar.style.cursor = 'pointer';
        btnGuardar.textContent = 'GUARDAR CAMBIOS / IMPRIMIR';
        btnReimprimir.style.display = 'none';
    } else {
        btnGuardar.textContent = 'GUARDAR / IMPRIMIR';
    }

}
