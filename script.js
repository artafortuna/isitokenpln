document.getElementById('year').textContent = new Date().getFullYear();

// ==========================================
// 1. TEMA DARK/LIGHT MODE
// ==========================================
const htmlEl = document.documentElement;
const themeBtn = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('pln_theme') || 'light';
htmlEl.setAttribute('data-theme', currentTheme);
themeBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

themeBtn.addEventListener('click', () => {
    let theme = htmlEl.getAttribute('data-theme');
    let newTheme = theme === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', newTheme);
    localStorage.setItem('pln_theme', newTheme);
    themeBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
});

// ==========================================
// 2. SISTEM TAB (Navigasi Single Page)
// ==========================================
function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
    if(tabId === 'data-view') { renderTable(); }
}

// ==========================================
// 3. LOGIKA PERHITUNGAN FORM
// ==========================================
document.getElementById('noToken').addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 0) value = value.match(new RegExp('.{1,4}', 'g')).join('-');
    e.target.value = value;
});

const formInputs = ['kwhDidapat', 'saldoAwal', 'saldoAkhir'];
const hitungPenggunaan = () => {
    const kwhDidapat = parseFloat(document.getElementById('kwhDidapat').value) || 0;
    const awal = parseFloat(document.getElementById('saldoAwal').value) || 0;
    const akhirInput = document.getElementById('saldoAkhir').value; 
    const inputPenggunaan = document.getElementById('penggunaan');

    if(document.getElementById('saldoAwal').value !== '' && document.getElementById('kwhDidapat').value !== '') {
        if(akhirInput !== '') {
            const akhir = parseFloat(akhirInput);
            const penggunaan = (awal + kwhDidapat) - akhir;
            inputPenggunaan.value = penggunaan.toFixed(2);
        } else {
            inputPenggunaan.value = '';
            inputPenggunaan.placeholder = 'Menunggu Saldo Akhir...';
        }
    } else {
        inputPenggunaan.value = '';
        inputPenggunaan.placeholder = 'Otomatis Dihitung';
    }
};

formInputs.forEach(id => { document.getElementById(id).addEventListener('input', hitungPenggunaan); });

const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka);
};

const formatDateID = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
};

// Fungsi klik pintasan ID Favorit
window.pilihFavId = (id) => {
    document.getElementById('idPelanggan').value = id;
};

// ==========================================
// 4. DATABASE (IndexedDB)
// ==========================================
const dbName = 'PLNDatabase';
const storeName = 'token_history';
let db, editId = null;

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains(storeName)) {
                database.createObjectStore(storeName, { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => { db = e.target.result; resolve(db); };
        request.onerror = (e) => reject(e);
    });
};

const saveToDB = (data) => {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(data); 
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
    });
};

const getAllFromDB = () => {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e);
    });
};

const deleteFromDB = (id) => {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
    });
};

// Rendering daftar tombol ID pelanggan terpopuler/terakhir dimasukkan
const renderFavoriteIDs = async () => {
    const container = document.getElementById('fav-id-container');
    container.innerHTML = '';
    try {
        const allData = await getAllFromDB();
        // Ambil semua ID Pelanggan yang unik
        const uniqueIDs = [...new Set(allData.map(item => item.idPelanggan).filter(Boolean))];
        
        // Tampilkan maksimal 5 ID unik sebagai tombol cepat
        uniqueIDs.slice(0, 5).forEach(id => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-preset';
            btn.textContent = id;
            btn.onclick = () => pilihFavId(id);
            container.appendChild(btn);
        });
    } catch (error) {
        console.error(error);
    }
};

// ==========================================
// 5. LOGIKA FORM SUBMIT & RENDERING
// ==========================================
document.getElementById('pln-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const akhirInput = document.getElementById('saldoAkhir').value;
    const penggunaanInput = document.getElementById('penggunaan').value;

    const dataToken = {
        id: editId ? editId : Date.now(),
        tanggal: document.getElementById('tanggal').value,
        idPelanggan: document.getElementById('idPelanggan').value,
        noToken: document.getElementById('noToken').value,
        nominal: parseFloat(document.getElementById('nominal').value) || 0,
        kwhDidapat: parseFloat(document.getElementById('kwhDidapat').value) || 0,
        saldoAwal: parseFloat(document.getElementById('saldoAwal').value) || 0,
        saldoAkhir: akhirInput !== '' ? parseFloat(akhirInput) : null,
        penggunaan: penggunaanInput !== '' ? parseFloat(penggunaanInput) : null,
        catatan: document.getElementById('catatan').value
    };

    try {
        await saveToDB(dataToken);
        e.target.reset();
        document.getElementById('penggunaan').value = '';
        document.getElementById('penggunaan').placeholder = 'Otomatis Dihitung';
        resetFormState();
        
        document.getElementById('filterTahun').value = dataToken.tanggal.substring(0, 4);
        
        await renderFavoriteIDs(); 
        document.querySelectorAll('.tab-btn')[1].click(); 
    } catch (error) {
        alert("Gagal menyimpan data ke IndexedDB!");
        console.error(error);
    }
});

const renderTable = async () => {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '<tr><td colspan="13">Memuat data...</td></tr>';

    try {
        let allData = await getAllFromDB();
        // Urutkan dari yang terbaru ke terlama
        allData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        const filterTahun = document.getElementById('filterTahun').value;
        let sumTahNominal = 0, sumTahKwh = 0;

        const filteredData = allData.filter(item => {
            const itemTahun = item.tanggal.substring(0, 4);
            if (itemTahun === filterTahun) {
                sumTahNominal += item.nominal;
                if(item.penggunaan !== null) sumTahKwh += item.penggunaan;
                return true; 
            }
            return false;
        });

        tbody.innerHTML = '';
        if (filteredData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="13" style="color: var(--text-muted); padding: 20px;">Belum ada data untuk tahun ini.</td></tr>`;
        } else {
            filteredData.forEach((item) => {
                const tr = document.createElement('tr');
                const tdAkhir = item.saldoAkhir !== null ? item.saldoAkhir : '<span style="color:var(--danger); font-size:0.95rem;"><i>Belum diisi</i></span>';
                const tdPenggunaan = item.penggunaan !== null ? item.penggunaan.toFixed(2) : '-';
                const penggunaanRp = item.penggunaan !== null ? formatRupiah(item.penggunaan * 415) : '-';

                // LOGIKA HITUNG RATA-RATA HARIAN
                const itemIndex = allData.indexOf(item);
                let newerRecord = null;
                // Cari data pengisian token SELANJUTNYA untuk ID Pelanggan yang sama
                for (let i = itemIndex - 1; i >= 0; i--) {
                    if (allData[i].idPelanggan === item.idPelanggan) {
                        newerRecord = allData[i];
                        break;
                    }
                }

                let daysDiff = 0;
                if (newerRecord) {
                    daysDiff = (new Date(newerRecord.tanggal) - new Date(item.tanggal)) / (1000 * 60 * 60 * 24);
                } else if (item.saldoAkhir !== null) {
                    // Jika tidak ada data selanjutnya tapi saldo akhir diisi, asumsikan dihitung hari ini
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const itemDate = new Date(item.tanggal);
                    itemDate.setHours(0,0,0,0);
                    daysDiff = (today - itemDate) / (1000 * 60 * 60 * 24);
                }
                
                // Pastikan minimal hari adalah 1 untuk mencegah error dibagi Nol
                daysDiff = Math.max(1, Math.round(daysDiff));

                const tdRataKwh = item.penggunaan !== null ? (item.penggunaan / daysDiff).toFixed(2) : '-';
                const tdRataRp = item.penggunaan !== null ? formatRupiah((item.penggunaan * 415) / daysDiff) : '-';

                tr.innerHTML = `
                    <td>${formatDateID(item.tanggal)}</td>
                    <td>${item.idPelanggan}</td>
                    <td style="font-family: monospace; letter-spacing: 1px;">${item.noToken}</td>
                    <td class="text-blue"><b>${formatRupiah(item.nominal)}</b></td>
                    <td>${item.kwhDidapat}</td>
                    <td>${item.saldoAwal}</td>
                    <td>${tdAkhir}</td>
                    <td style="background-color: var(--terpakai-bg); font-weight: bold;">${tdPenggunaan}</td>
                    <td style="background-color: var(--terpakai-bg); font-weight: bold; color: var(--pln-yellow-dark);">${penggunaanRp}</td>
                    <td style="background-color: var(--highlight-bg); font-weight: bold;">${tdRataKwh}</td>
                    <td style="background-color: var(--highlight-bg); font-weight: bold; color: var(--pln-blue-dark);">${tdRataRp}</td>
                    <td>${item.catatan}</td>
                    <td class="actions-cell">
                        <button class="btn-sm btn-edit" onclick="editData(${item.id})">Edit</button>
                        <button class="btn-sm btn-delete" onclick="hapusData(${item.id})">Hapus</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        document.getElementById('sumTahunNominal').textContent = formatRupiah(sumTahNominal);
        document.getElementById('sumTahunKwh').textContent = sumTahKwh.toFixed(2) + ' KWh';

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="13" style="color: var(--danger);">Error memuat database.</td></tr>`;
        console.error(error);
    }
};

// ==========================================
// 6. FITUR EDIT & HAPUS
// ==========================================
window.editData = async (id) => {
    try {
        const allData = await getAllFromDB();
        const item = allData.find(d => d.id === id);
        if (!item) return;

        document.getElementById('tanggal').value = item.tanggal;
        document.getElementById('idPelanggan').value = item.idPelanggan;
        document.getElementById('noToken').value = item.noToken;
        document.getElementById('nominal').value = item.nominal;
        document.getElementById('kwhDidapat').value = item.kwhDidapat;
        document.getElementById('saldoAwal').value = item.saldoAwal;
        document.getElementById('saldoAkhir').value = item.saldoAkhir !== null ? item.saldoAkhir : '';
        document.getElementById('catatan').value = item.catatan;

        hitungPenggunaan();
        
        editId = id;
        document.getElementById('formTitle').textContent = "Lengkapi/Edit Data Token";
        document.getElementById('btnSubmit').innerHTML = "🔄 Update Data";
        document.getElementById('btnCancelEdit').style.display = "inline-block";
        document.querySelectorAll('.tab-btn')[0].click();
    } catch (error) {
        console.error(error);
    }
};

window.hapusData = async (id) => {
    if(confirm('Data ini akan dihapus permanen. Apakah Anda yakin?')) {
        try {
            await deleteFromDB(id);
            await renderFavoriteIDs(); 
            renderTable();
        } catch (error) {
            alert("Gagal menghapus data!");
        }
    }
};

document.getElementById('btnCancelEdit').addEventListener('click', () => {
    document.getElementById('pln-form').reset();
    document.getElementById('penggunaan').value = '';
    document.getElementById('penggunaan').placeholder = 'Otomatis Dihitung';
    resetFormState();
});

const resetFormState = () => {
    editId = null;
    document.getElementById('formTitle').textContent = "Tambah Data Token Baru";
    document.getElementById('btnSubmit').innerHTML = "💾 Simpan Data";
    document.getElementById('btnCancelEdit').style.display = "none";
};

// ==========================================
// 7. INISIALISASI
// ==========================================
document.getElementById('filterTahun').addEventListener('input', renderTable);

const initApp = async () => {
    try {
        await initDB();
        const dateNow = new Date();
        document.getElementById('filterTahun').value = dateNow.getFullYear();
        await renderFavoriteIDs(); 
        renderTable();
    } catch (error) {
        alert("Browser Anda tidak mendukung IndexedDB. Data tidak bisa disimpan.");
        console.error(error);
    }
};

initApp();

// === MENGUBAH TEKS MARQUEE ===
document.getElementById('teks-berjalan').innerHTML = 'Selamat datang di PLN Tracker Pro! Jangan lupa melengkapi Saldo Akhir KWh Anda sebelum melakukan pengisian token berikutnya agar penggunaan dapat terhitung otomatis. Beli token listrik murah, mudah, dan cepat di <a href="https://afortuna.id" target="_blank" style="color: var(--pln-yellow-dark); text-decoration: underline;">afortuna.id</a> ya!';
