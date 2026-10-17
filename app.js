// ===============================================
// HYPER-POS Enterprise Pro - Main Engine Updated
// ===============================================

const API_BASE = "http://localhost:8000/api";
const ADMIN_PIN = "2212";

// 1. قاعدة البيانات المحلية
let productsDB = JSON.parse(localStorage.getItem('productsDB')) || [
    { id: "101", name: "حليب طازج جهينة 1 لتر", costPrice: 30.00, price: 38.00, barcode: "6221001", cat: "dairy", stock: 8, minStock: 15, expiryDate: "2026-10-10", maxStock: 100 },
    { id: "102", name: "جبنة دومتي بلس 500ج", costPrice: 32.00, price: 42.50, barcode: "6221002", cat: "dairy", stock: 18, minStock: 10, expiryDate: "2026-09-30", maxStock: 100 },
    { id: "103", name: "بيبسي كانز 330مل", costPrice: 10.00, price: 14.00, barcode: "6221004", cat: "beverage", stock: 120, minStock: 20, expiryDate: "2027-05-01", maxStock: 200 },
    { id: "104", name: "مياه معدنية داساني 1.5L", costPrice: 6.00, price: 9.00, barcode: "6221005", cat: "beverage", stock: 80, minStock: 25, expiryDate: "2027-01-15", maxStock: 150 },
    { id: "105", name: "شيكولاتة كادبوري باللبن", costPrice: 26.00, price: 35.00, barcode: "6221008", cat: "snacks", stock: 5, minStock: 15, expiryDate: "2026-10-01", maxStock: 100 },
    { id: "106", name: "أرز المطبخ 1 كيلو", costPrice: 28.00, price: 36.00, barcode: "6221009", cat: "grocery", stock: 50, minStock: 10, expiryDate: "2027-08-20", maxStock: 100 },
    { id: "107", name: "ناجتس دجاج مجمد 400ج", costPrice: 65.00, price: 85.00, barcode: "6221010", cat: "frozen", stock: 4, minStock: 10, expiryDate: "2026-10-05", maxStock: 80 }
];

let employeesDB = JSON.parse(localStorage.getItem('employeesDB')) || [
    { code: "EMP-101", name: "علي الكاشير" },
    { code: "EMP-102", name: "حمزة الأدمن" }
];

let auditLogsDB = JSON.parse(localStorage.getItem('auditLogsDB')) || [];
let salesInvoicesDB = JSON.parse(localStorage.getItem('salesInvoicesDB')) || [
    {
        id: "INV-1001",
        date: "2026-09-23 14:30",
        rawDate: new Date("2026-09-23T14:30:00").toISOString(),
        payMethod: "cash",
        customer: "عميل نقدي",
        subtotal: 104.00,
        discount: 0,
        total: 118.56,
        costTotal: 80.00,
        profit: 38.56,
        items: [
            { id: "101", name: "حليب طازج جهينة 1 لتر", qty: 2, price: 38.00, costPrice: 30.00 },
            { id: "103", name: "بيبسي كانز 330مل", qty: 2, price: 14.00, costPrice: 10.00 }
        ]
    }
];

let validCoupons = { "SAVE10": 10, "HAMZA20": 20 };
let customersDB = JSON.parse(localStorage.getItem('customersDB')) || [
    { id: 1, name: "أحمد محمود", phone: "01099887766", debt: 150.00, points: 45 },
    { id: 2, name: "شركة النور للتوريدات", phone: "01122334455", debt: 1200.00, points: 310 }
];

let suppliersDB = JSON.parse(localStorage.getItem('suppliersDB')) || [
    { id: 1, name: "المهندس/ محمد أحمد", phone: "01234567890", company: "شركة جهينة للألبان", balance: 4500.00, history: [] }
];

let attendanceDB = JSON.parse(localStorage.getItem('attendanceDB')) || [
    { code: "EMP-101", name: "علي الكاشير", date: "2026-09-23", checkIn: "09:00:15", checkOut: "17:00:00", status: "انصرف" },
    { code: "EMP-102", name: "حمزة الأدمن", date: "2026-09-23", checkIn: "10:15:30", checkOut: "--", status: "حاضر الان" }
];

let cart = [];
let heldInvoices = JSON.parse(localStorage.getItem('heldInvoices')) || [];
let currentUser = null;
let currentCategory = "all";
let activeDiscountPercent = 0;
let activeSelectedReturnInv = null;

// تسجيل حدث في سجل الحركة (Audit Trail)
function logAuditEvent(actionType, details) {
    const log = {
        timestamp: new Date().toLocaleString('ar-EG'),
        user: currentUser ? currentUser.name : "النظام",
        action: actionType,
        details: details
    };
    auditLogsDB.unshift(log);
    saveAllToLocalStorage();
}

function saveAllToLocalStorage() {
    localStorage.setItem('productsDB', JSON.stringify(productsDB));
    localStorage.setItem('employeesDB', JSON.stringify(employeesDB));
    localStorage.setItem('salesInvoicesDB', JSON.stringify(salesInvoicesDB));
    localStorage.setItem('auditLogsDB', JSON.stringify(auditLogsDB));
    localStorage.setItem('customersDB', JSON.stringify(customersDB));
    localStorage.setItem('suppliersDB', JSON.stringify(suppliersDB));
    localStorage.setItem('attendanceDB', JSON.stringify(attendanceDB));
    localStorage.setItem('heldInvoices', JSON.stringify(heldInvoices));
}

const customAlert = (title, html, icon = 'info') => {
    Swal.fire({
        title: title, html: html, icon: icon,
        confirmButtonText: 'حسناً', confirmButtonColor: '#3b82f6',
        background: '#1e293b', color: '#ffffff'
    });
};

async function requestAdminPin(actionName) {
    if (currentUser && currentUser.role === 'admin') return true;

    const { value: pin } = await Swal.fire({
        title: 'تأكيد صلاحية الأدمن',
        text: `العملية (${actionName}) تتطلب رمز PIN الأدمن (حمزة):`,
        input: 'password',
        inputPlaceholder: 'ادخل رمز PIN...',
        showCancelButton: true,
        confirmButtonText: 'تأكيد',
        cancelButtonText: 'إلغاء',
        background: '#1e293b', color: '#ffffff', confirmButtonColor: '#ef4444'
    });

    if (pin === ADMIN_PIN) {
        logAuditEvent("تأكيد صلاحية", `تمت الموافقة على إجراء: ${actionName}`);
        return true;
    } else if (pin) {
        customAlert('خطأ', 'رمز PIN غير صحيح!', 'error');
    }
    return false;
}

// ===============================================
// 1. تسجيل الدخول والوضع الداكن
// ===============================================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const role = document.getElementById('userRoleSelect').value;
    const password = document.getElementById('passwordInput').value;

    if (role === 'admin' && password === ADMIN_PIN) {
        currentUser = { name: 'حمزة (أدمن)', role: 'admin' };
    } else if (role === 'cashier' && password === '1234') {
        currentUser = { name: 'علي (كاشير)', role: 'cashier' };
    } else {
        customAlert('خطأ في الدخول', 'كلمة المرور غير صحيحة!', 'error');
        return;
    }

    logAuditEvent("تسجيل دخول", `قام ${currentUser.name} بالدخول للنظام`);
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('appLayout').style.display = 'flex';
    applyPermissions();
    checkInventoryAlerts();
    filterAndRenderProducts();
    renderAttendanceTable();
});

document.getElementById('btnThemeToggle').onclick = () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    document.getElementById('btnThemeToggle').innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
};

function applyPermissions() {
    document.getElementById('currentUserDisplay').innerText = currentUser.name;
    document.getElementById('currentRoleDisplay').innerText = currentUser.role === 'admin' ? 'مدير النظام (أدمن)' : 'كاشير';

    const adminButtons = document.querySelectorAll('.admin-only');
    if (currentUser.role === 'cashier') {
        adminButtons.forEach(btn => {
            btn.classList.add('disabled');
            btn.title = "خاص بمدير النظام حمزة فقط";
        });
    } else {
        adminButtons.forEach(btn => {
            btn.classList.remove('disabled');
            btn.title = "";
        });
    }
}

// ===============================================
// 2. تنبيهات النواقص وتقارير الموردين
// ===============================================
function checkInventoryAlerts() {
    let lowStockCount = 0;
    let nearExpiryCount = 0;
    const today = new Date();

    productsDB.forEach(p => {
        if (p.stock <= p.minStock) lowStockCount++;
        if (p.expiryDate) {
            const expDate = new Date(p.expiryDate);
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30 && diffDays >= 0) nearExpiryCount++;
        }
    });

    document.getElementById('notifBadge').innerText = lowStockCount + nearExpiryCount;
}

document.getElementById('btnNotifications').onclick = () => {
    const today = new Date();
    let lowStockList = productsDB.filter(p => p.stock <= p.minStock);
    let expiryList = productsDB.filter(p => {
        if (!p.expiryDate) return false;
        const expDate = new Date(p.expiryDate);
        const diff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        return diff <= 30 && diff >= 0;
    });

    let html = `<div style="text-align:right; font-size:0.9rem;">`;
    html += `<h4 style="color:var(--accent-red); margin-bottom:5px;">\u26A0\uFE0F سلع وصلت للحد الأدنى للنواقص (${lowStockList.length}):</h4><ul>`;
    lowStockList.forEach(p => html += `<li>${p.name} - المتبقي: <b>${p.stock}</b> (الحد الأدنى: ${p.minStock})</li>`);
    html += `</ul><hr style="margin:10px 0; border-color:var(--border-color);">`;
    html += `<h4 style="color:var(--accent-orange); margin-bottom:5px;">\u23F3 سلع قريبة من الانتهاء (${expiryList.length}):</h4><ul>`;
    expiryList.forEach(p => html += `<li>${p.name} - انتهاء: <b>${p.expiryDate}</b></li>`);
    html += `</ul></div>`;

    customAlert('تقرير التنبيهات الذكية', html, 'warning');
};

document.getElementById('btnLowStockReport').onclick = exportLowStockReport;
document.getElementById('btnExportLowStock').onclick = exportLowStockReport;

function exportLowStockReport() {
    let lowStockList = productsDB.filter(p => p.stock <= p.minStock);
    if (lowStockList.length === 0) {
        return customAlert('لا توجد نواقص', 'جميع المنتجات بالمخزن تتجاوز حد التنبيه الأدنى.', 'info');
    }

    let reportHtml = `
        <div style="padding:20px; font-family:sans-serif; direction:rtl;">
            <h2 style="text-align:center;">تقرير نواقص المخزن للموردين</h2>
            <p style="text-align:center; color:#666;">تاريخ التقرير: ${new Date().toLocaleString('ar-EG')}</p>
            <table border="1" style="width:100%; border-collapse:collapse; margin-top:15px; text-align:right;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px;">الباركود</th>
                        <th style="padding:8px;">اسم المنتج</th>
                        <th style="padding:8px;">المخزون الحالي</th>
                        <th style="padding:8px;">الحد الأدنى</th>
                        <th style="padding:8px;">سعر التكلفة</th>
                    </tr>
                </thead>
                <tbody>
                    ${lowStockList.map(p => `
                        <tr>
                            <td style="padding:8px;">${p.barcode}</td>
                            <td style="padding:8px;">${p.name}</td>
                            <td style="padding:8px; color:red; font-weight:bold;">${p.stock}</td>
                            <td style="padding:8px;">${p.minStock}</td>
                            <td style="padding:8px;">${(p.costPrice || 0).toFixed(2)} ج.م</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    const printWin = window.open('', '_blank');
    printWin.document.write(reportHtml);
    printWin.document.close();
    printWin.print();
}

// ===============================================
// 3. التنقل بين الشاشات واللوحات
// ===============================================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
        if (btn.classList.contains('disabled')) {
            customAlert('صلاحيات غير كافية', 'عذراً! هذه الشاشة مخصصة لمدير النظام (حمزة) فقط.', 'warning');
            return;
        }

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetView = btn.dataset.view;
        document.querySelectorAll('.view-panel').forEach(view => view.classList.remove('active'));
        document.getElementById(targetView).classList.add('active');

        if (targetView === 'inventoryView') renderInventoryTable();
        if (targetView === 'suppliersView') renderSuppliersTable();
        if (targetView === 'customersView') renderCustomersTable();
        if (targetView === 'heldView') renderHeldInvoices();
        if (targetView === 'returnsView') renderInvoicesLogsTable();
        if (targetView === 'attendanceView') renderAttendanceTable();
        if (targetView === 'auditLogView') renderAuditLogTable();
        if (targetView === 'analyticsView') renderAnalyticsCharts();
    };
});

// ===============================================
// 4. الحضور والانصراف وإدارة الموظفين
// ===============================================
document.getElementById('btnAddEmp').onclick = async () => {
    const nameInput = document.getElementById('newEmpName');
    const codeInput = document.getElementById('newEmpCode');

    const name = nameInput.value.trim();
    const code = codeInput.value.trim().toUpperCase();

    if (!name || !code) {
        return customAlert('خطأ في البيانات', 'يرجى كتابة اسم الموظف وكود الباركود بشكل صحيح.', 'error');
    }

    const exists = employeesDB.some(e => e.code === code);
    if (exists) {
        return customAlert('تكرار الكود', 'كود الموظف هذا مسجل لموظف آخر بالفعل!', 'warning');
    }

    const newEmployee = { code: code, name: name };
    employeesDB.push(newEmployee);
    logAuditEvent("إضافة موظف", `تمت إضافة الموظف الجديد: ${name} (${code})`);
    
    saveAllToLocalStorage();

    nameInput.value = '';
    codeInput.value = '';

    renderAttendanceTable();
    
    customAlert('تمت الإضافة', `تم تسجيل الموظف <b>${name}</b> بنجاح وحفظه في النظام!`, 'success');
};

document.getElementById('btnCheckIn').onclick = () => handleAttendance('in');
document.getElementById('btnCheckOut').onclick = () => handleAttendance('out');

function handleAttendance(type) {
    const code = document.getElementById('empCodeInput').value.trim().toUpperCase();
    if (!code) return customAlert('تنبيه', 'يرجى ادخال كود الموظف.', 'warning');

    const emp = employeesDB.find(e => e.code === code);
    if (!emp) return customAlert('غير موجود', 'كود الموظف غير مسجل بالمنظومة.', 'error');

    const todayStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('ar-EG');
    let record = attendanceDB.find(a => a.code === code && a.date === todayStr);

    if (type === 'in') {
        if (record) return customAlert('تنبيه', `الموظف (<b>${emp.name}</b>) مسجل حضور بالفعل.`, 'info');
        attendanceDB.unshift({ code: emp.code, name: emp.name, date: todayStr, checkIn: timeStr, checkOut: "--", status: "حاضر الان" });
        logAuditEvent("تسجيل حضور", `حضور الموظف ${emp.name}`);
        customAlert('تم الحضور', `تسجيل حضور الموظف (<b>${emp.name}</b>) الساعة ${timeStr}`, 'success');
    } else {
        if (!record || record.checkOut !== "--") return customAlert('خطأ', 'لم يتم العثور على تسجيل حضور نشط.', 'error');
        record.checkOut = timeStr;
        record.status = "انصرف";
        logAuditEvent("تسجيل انصراف", `انصراف الموظف ${emp.name}`);
        customAlert('تم الانصراف', `تسجيل انصراف (<b>${emp.name}</b>) الساعة ${timeStr}`, 'success');
    }

    saveAllToLocalStorage();
    document.getElementById('empCodeInput').value = '';
    renderAttendanceTable();
}

function renderAttendanceTable() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    employeesDB.forEach(emp => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const record = attendanceDB.find(a => a.code === emp.code && a.date === todayStr);

        const tr = document.createElement('tr');
        if (record) {
            const isPresent = record.status === "حاضر الان";
            tr.innerHTML = `
                <td><code>${record.code}</code></td>
                <td><strong>${record.name}</strong></td>
                <td>${record.date}</td>
                <td style="color:var(--accent-green);">${record.checkIn}</td>
                <td style="color:var(--accent-orange);">${record.checkOut}</td>
                <td><span class="badge" style="position:static; background:${isPresent ? 'var(--accent-green)' : 'var(--accent-blue)'};">${record.status}</span></td>
            `;
        } else {
            tr.innerHTML = `
                <td><code>${emp.code}</code></td>
                <td><strong>${emp.name}</strong></td>
                <td>${todayStr}</td>
                <td>--</td>
                <td>--</td>
                <td><span class="badge" style="position:static; background:var(--border-color);">لم يحضر اليوم</span></td>
            `;
        }
        tbody.appendChild(tr);
    });
}

// ===============================================
// 5. اختصارات لوحة المفاتيح
// ===============================================
window.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
        e.preventDefault();
        document.getElementById('holdInvoiceBtn').click();
    }
    if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('payInvoiceBtn').click();
    }
    if (e.key === 'F4') {
        e.preventDefault();
        document.querySelector('[data-view="posView"]').click();
        document.getElementById('barcodeSearch').focus();
    }
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('payInvoiceBtn').click();
    }
});

// ===============================================
// 6. شاشة البيع، السلة، وطباعة الفاتورة
// ===============================================
document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        filterAndRenderProducts();
    });
});

document.getElementById('barcodeSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const code = e.target.value.trim();
        if (!code) return;

        const product = productsDB.find(p => p.barcode === code || p.id === code);
        if (product) {
            addToCart(product);
            e.target.value = '';
            filterAndRenderProducts();
        } else {
            customAlert('غير موجود', 'لم يتم العثور على منتج بهذا الباركود.', 'warning');
        }
    }
});

document.getElementById('barcodeSearch').addEventListener('input', () => filterAndRenderProducts());

function filterAndRenderProducts() {
    const searchVal = document.getElementById('barcodeSearch').value.toLowerCase().trim();
    const filtered = productsDB.filter(p => {
        const matchesCategory = currentCategory === 'all' || p.cat === currentCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchVal) || p.barcode.includes(searchVal);
        return matchesCategory && matchesSearch;
    });
    renderProducts(filtered);
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = '';
    if (products.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 20px; color: var(--text-muted);">لا توجد منتجات مطابقة</div>`;
        return;
    }
    products.forEach(p => {
        const isLow = p.stock <= p.minStock;
        const card = document.createElement('div');
        card.className = `product-card ${isLow ? 'low-stock' : ''}`;
        card.innerHTML = `
            <div><strong>${p.name}</strong></div>
            <div style="color:var(--accent-green); font-weight:bold;">${p.price.toFixed(2)} ج.م</div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <small style="color:${isLow ? 'var(--accent-red)' : 'var(--text-muted)'}; font-weight:${isLow?'bold':'normal'};">
                    ${isLow ? '\u26A0\uFE0F ناقص: ' : 'المتبقي: '}${p.stock}
                </small>
            </div>
        `;
        card.onclick = () => addToCart(p);
        grid.appendChild(card);
    });
}

function addToCart(product) {
    if (product.stock <= 0) {
        return customAlert('تنبيه المخزون', 'هذا المنتج نفذ من المخزن تماماً!', 'error');
    }
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
        if (existing.qty + 1 > product.stock) {
            return customAlert('تنبيه', 'لا توجد كمية كافية بالمخزن للزيادة.', 'warning');
        }
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
}

function updateCartUI() {
    const tbody = document.getElementById('cartTableBody');
    tbody.innerHTML = '';
    document.getElementById('emptyCartMsg').style.display = cart.length === 0 ? 'block' : 'none';

    let subtotal = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>
                <button class="btn-action btn-sm btn-cancel" onclick="changeCartQty('${item.id}', -1)">-</button>
                <span style="margin: 0 4px; font-weight:bold;">${item.qty}</span>
                <button class="btn-action btn-sm btn-pay" onclick="changeCartQty('${item.id}', 1)">+</button>
            </td>
            <td>${item.price.toFixed(2)}</td>
            <td>${itemTotal.toFixed(2)}</td>
            <td><i class="fa-solid fa-xmark" style="color:var(--accent-red); cursor:pointer;" onclick="removeItem('${item.id}')"></i></td>
        `;
        tbody.appendChild(tr);
    });

    let discountVal = (subtotal * activeDiscountPercent) / 100;
    const taxRate = parseFloat(document.getElementById('settingTaxRate')?.value || 14) / 100;
    let netSubtotal = Math.max(0, subtotal - discountVal);
    const tax = netSubtotal * taxRate;
    const grandTotal = netSubtotal + tax;

    document.getElementById('subTotal').innerText = `${subtotal.toFixed(2)} ج.م`;
    if (activeDiscountPercent > 0) {
        document.getElementById('discountRow').style.display = 'flex';
        document.getElementById('discountVal').innerText = `-${discountVal.toFixed(2)} ج.م (${activeDiscountPercent}%)`;
    } else {
        document.getElementById('discountRow').style.display = 'none';
    }
    document.getElementById('taxVal').innerText = `${tax.toFixed(2)} ج.م`;
    document.getElementById('grandTotal').innerText = grandTotal.toFixed(2);
}

function changeCartQty(id, delta) {
    const item = cart.find(i => i.id === id);
    const prod = productsDB.find(p => p.id === id);
    if (!item) return;

    if (delta > 0 && item.qty + delta > prod.stock) {
        return customAlert('تنبيه', 'الكمية المطلوبة تتجاوز المتاح بالمخزن.', 'warning');
    }

    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== id);
    }
    updateCartUI();
}

function removeItem(id) {
    cart = cart.filter(i => i.id !== id);
    updateCartUI();
}

document.getElementById('clearCartBtn').onclick = () => {
    if (cart.length === 0) return;
    cart = [];
    activeDiscountPercent = 0;
    document.getElementById('couponInput').value = '';
    updateCartUI();
};

document.getElementById('btnApplyCoupon').onclick = () => {
    const code = document.getElementById('couponInput').value.trim().toUpperCase();
    if (validCoupons[code]) {
        activeDiscountPercent = validCoupons[code];
        customAlert('تم تطبيق الكوبون', `تم تطبيق خصم بقيمة <b>${activeDiscountPercent}%</b> بنجاح!`, 'success');
        updateCartUI();
    } else {
        customAlert('كوبون غير صالح', 'رمز الكوبون غير صحيح أو منتهي الصلاحية.', 'error');
    }
};

document.getElementById('btnManualDiscount').onclick = async () => {
    const authorized = await requestAdminPin("تطبيق خصم يدوي");
    if (!authorized) return;

    const { value: percent } = await Swal.fire({
        title: 'خصم يدوي',
        input: 'number',
        inputLabel: 'ادخل نسبة الخصم (%):',
        inputPlaceholder: 'مثال: 15',
        showCancelButton: true,
        confirmButtonText: 'تطبيق',
        cancelButtonText: 'إلغاء',
        background: '#1e293b', color: '#ffffff'
    });

    if (percent !== null && percent >= 0 && percent <= 100) {
        activeDiscountPercent = parseFloat(percent);
        logAuditEvent("خصم يدوي", `تم تطبيق خصم يدوي ${activeDiscountPercent}%`);
        updateCartUI();
    }
};

document.getElementById('holdInvoiceBtn').onclick = async () => {
    if (cart.length === 0) return customAlert('السلة فارغة', 'لا توجد عناصر لتعليقها.', 'warning');

    const { value: note } = await Swal.fire({
        title: 'تعليق الفاتورة',
        input: 'text',
        inputPlaceholder: 'ادخل اسم العميل أو ملاحظة للفاتورة المعلقة...',
        showCancelButton: true,
        confirmButtonText: 'حفظ وتعليق',
        cancelButtonText: 'إلغاء',
        background: '#1e293b', color: '#ffffff'
    });

    if (note !== null) {
        const heldItem = {
            id: `HOLD-${Date.now()}`,
            date: new Date().toLocaleTimeString('ar-EG'),
            note: note || "بدون ملاحظات",
            cart: [...cart],
            discountPercent: activeDiscountPercent
        };
        heldInvoices.push(heldItem);
        logAuditEvent("تعليق فاتورة", `تم تعليق فاتورة باسم: ${heldItem.note}`);
        saveAllToLocalStorage();

        cart = [];
        activeDiscountPercent = 0;
        document.getElementById('couponInput').value = '';
        updateCartUI();
        customAlert('تم التعليق', 'تم حفظ الفاتورة بقائمة الفواتير المعلقة.', 'success');
    }
};

function renderHeldInvoices() {
    const container = document.getElementById('heldInvoicesList');
    if (!container) return;
    container.innerHTML = '';

    if (heldInvoices.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted);">لا توجد فواتير معلقة حالياً.</p>`;
        return;
    }

    heldInvoices.forEach((h, index) => {
        const card = document.createElement('div');
        card.className = 'held-card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>\u1F4CC ${h.note}</strong>
                <small style="color:var(--text-muted);">${h.date}</small>
            </div>
            <div style="font-size:0.85rem; color:var(--text-muted);">عدد العناصر: ${h.cart.reduce((a, b) => a + b.qty, 0)}</div>
            <div style="display:flex; gap:10px; margin-top:5px;">
                <button class="btn-action btn-pay btn-sm" style="flex:1;" onclick="restoreHeldInvoice(${index})"><i class="fa-solid fa-play"></i> استعادة للبيع</button>
                <button class="btn-action btn-cancel btn-sm" onclick="deleteHeldInvoice(${index})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
}

function restoreHeldInvoice(index) {
    if (cart.length > 0) {
        Swal.fire({
            title: 'تنبيه',
            text: 'السلة الحالية تحتوي على منتجات، هل تريد استبدالها بالفعل؟',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، استبدل',
            cancelButtonText: 'إلغاء',
            background: '#1e293b', color: '#ffffff'
        }).then((result) => {
            if (result.isConfirmed) executeRestore(index);
        });
    } else {
        executeRestore(index);
    }
}

function executeRestore(index) {
    const item = heldInvoices[index];
    cart = [...item.cart];
    activeDiscountPercent = item.discountPercent || 0;
    heldInvoices.splice(index, 1);
    saveAllToLocalStorage();
    document.querySelector('[data-view="posView"]').click();
    updateCartUI();
    customAlert('تمت الاستعادة', 'تم تحميل الفاتورة المعلقة بنجاح إلى السلة.', 'success');
}

function deleteHeldInvoice(index) {
    heldInvoices.splice(index, 1);
    saveAllToLocalStorage();
    renderHeldInvoices();
}

document.getElementById('payInvoiceBtn').onclick = () => {
    if (cart.length === 0) return customAlert('السلة فارغة', 'يرجى إضافة منتجات أولاً.', 'warning');
    document.getElementById('payModalTotal').innerText = document.getElementById('grandTotal').innerText;
    document.getElementById('payModal').style.display = 'flex';
};

document.getElementById('btnCancelPay').onclick = () => { document.getElementById('payModal').style.display = 'none'; };

document.getElementById('btnConfirmPay').onclick = async () => {
    document.getElementById('payModal').style.display = 'none';
    const payMethod = document.getElementById('payMethod').value;
    const now = new Date();

    let subtotal = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    let costTotal = cart.reduce((a, b) => a + ((b.costPrice || 0) * b.qty), 0);
    let discountVal = (subtotal * activeDiscountPercent) / 100;
    let netTotal = parseFloat(document.getElementById('grandTotal').innerText);
    let profit = netTotal - costTotal;

    const invoiceData = {
        id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        date: now.toLocaleString('ar-EG'),
        rawDate: now.toISOString(),
        payMethod: payMethod,
        customer: "عميل نقدي",
        subtotal: subtotal,
        discount: discountVal,
        total: netTotal,
        costTotal: costTotal,
        profit: profit,
        items: cart.map(item => ({...item, costPrice: item.costPrice || 0}))
    };

    cart.forEach(c => {
        const prod = productsDB.find(p => p.id === c.id);
        if (prod) prod.stock = Math.max(0, prod.stock - c.qty);
    });

    salesInvoicesDB.unshift(invoiceData);
    logAuditEvent("إصدار فاتورة", `فاتورة جديدة رقم ${invoiceData.id} بقيمة ${netTotal} ج.م`);
    saveAllToLocalStorage();

    printThermalReceipt(invoiceData);

    customAlert('نجاح العملية', `تم حفظ الفاتورة برقم <b>${invoiceData.id}</b> وتحديث المخزون وطباعتها!`, 'success');
    cart = [];
    activeDiscountPercent = 0;
    document.getElementById('couponInput').value = '';
    updateCartUI();
    checkInventoryAlerts();
    filterAndRenderProducts();
};

function printThermalReceipt(inv) {
    const storeName = document.getElementById('settingStoreName')?.value || "هايبر ماركت الأمل";
    const storePhone = document.getElementById('settingStorePhone')?.value || "01012345678";
    const policy = document.getElementById('settingReturnPolicy')?.value || "";
    const paperWidth = document.getElementById('settingReceiptPaperWidth')?.value || "80mm";

    const oldReceipt = document.getElementById('thermalReceipt');
    if (oldReceipt) oldReceipt.remove();

    const receiptDiv = document.createElement('div');
    receiptDiv.id = 'thermalReceipt';
    receiptDiv.style.width = paperWidth === '58mm' ? '200px' : '280px';
    receiptDiv.style.padding = '10px';
    receiptDiv.style.margin = '0 auto';

    let itemsHtml = '';
    inv.items.forEach(it => {
        itemsHtml += `
            <div style="display:flex; justify-content:space-between; font-size:11px;">
                <span>${it.name} (x${it.qty})</span>
                <span>${(it.price * it.qty).toFixed(2)}</span>
            </div>
        `;
    });

    receiptDiv.innerHTML = `
        <div style="text-align:center; border-bottom:1px dashed #000; padding-bottom:5px; margin-bottom:5px;">
            <h3 style="margin:0;">${storeName}</h3>
            <p style="margin:2px 0; font-size:10px;">هاتف: ${storePhone}</p>
            <p style="margin:2px 0; font-size:10px;">فاتورة: ${inv.id} - ${inv.date}</p>
        </div>
        <div style="border-bottom:1px dashed #000; padding-bottom:5px; margin-bottom:5px;">
            ${itemsHtml}
        </div>
        <div style="border-bottom:1px dashed #000; padding-bottom:5px; margin-bottom:5px; font-size:11px;">
            <div style="display:flex; justify-content:space-between;"><span>الإجمالي:</span><span>${inv.total.toFixed(2)} ج.م</span></div>
            <div style="display:flex; justify-content:space-between;"><span>طريقة الدفع:</span><span>${inv.payMethod === 'card' ? 'فيزا' : 'كاش'}</span></div>
        </div>
        <div style="text-align:center; font-size:9px;">
            <p style="margin:3px 0;">${policy}</p>
            <p style="margin:3px 0;">*** شكراً لزيارتكم ***</p>
        </div>
    `;

    document.body.appendChild(receiptDiv);
    window.print();
}

// ===============================================
// 7. شاشة سجل الفواتير والمرتجعات
// ===============================================
function renderInvoicesLogsTable() {
    const tbody = document.getElementById('invoicesLogsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchVal = document.getElementById('returnInvSearch')?.value.trim().toLowerCase() || '';
    const timeFilter = document.getElementById('invoiceTimeFilter')?.value || 'all';

    const now = new Date();
    const filteredInvoices = salesInvoicesDB.filter(inv => {
        const matchesSearch = inv.id.toLowerCase().includes(searchVal);
        let matchesTime = true;

        if (inv.rawDate) {
            const invDate = new Date(inv.rawDate);
            if (timeFilter === 'today') {
                matchesTime = invDate.toDateString() === now.toDateString();
            } else if (timeFilter === 'month') {
                matchesTime = invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
            } else if (timeFilter === 'year') {
                matchesTime = invDate.getFullYear() === now.getFullYear();
            }
        }
        return matchesSearch && matchesTime;
    });

    filteredInvoices.forEach(inv => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${inv.id}</code></td>
            <td><small>${inv.date}</small></td>
            <td><span class="table-badge">${inv.payMethod === 'card' ? 'فيزا' : 'كاش'}</span></td>
            <td style="color:var(--accent-green); font-weight:bold;">${inv.total.toFixed(2)} ج.م</td>
            <td>${inv.items.reduce((a, b) => a + b.qty, 0)}</td>
            <td>
                <button class="btn-action btn-hold btn-sm" onclick="selectInvoiceForReturn('${inv.id}')"><i class="fa-solid fa-eye"></i> عروض التفاصيل</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('btnFilterInvoices').onclick = renderInvoicesLogsTable;
document.getElementById('returnInvSearch').oninput = renderInvoicesLogsTable;

function selectInvoiceForReturn(invId) {
    const inv = salesInvoicesDB.find(i => i.id === invId);
    if (!inv) return;

    activeSelectedReturnInv = inv;
    document.getElementById('returnResultDetails').style.display = 'block';
    document.getElementById('returnInvNum').innerText = inv.id;
    document.getElementById('returnInvDate').innerText = inv.date;

    const tbody = document.getElementById('returnItemsTableBody');
    tbody.innerHTML = '';

    inv.items.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.name}</strong></td>
            <td>${item.qty}</td>
            <td>${item.price.toFixed(2)} ج.م</td>
            <td>
                <button class="btn-action btn-cancel btn-sm" onclick="processItemReturn(${idx})"><i class="fa-solid fa-rotate-left"></i> إرجاع عنصر</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function processItemReturn(itemIdx) {
    if (!activeSelectedReturnInv) return;
    const authorized = await requestAdminPin("إرجاع عنصر من الفاتورة");
    if (!authorized) return;

    const item = activeSelectedReturnInv.items[itemIdx];
    const prod = productsDB.find(p => p.id === item.id);
    if (prod) prod.stock += item.qty;

    logAuditEvent("مرتجع صنف", `تم إرجاع ${item.qty} من ${item.name} للفاتورة ${activeSelectedReturnInv.id}`);
    
    activeSelectedReturnInv.items.splice(itemIdx, 1);
    if (activeSelectedReturnInv.items.length === 0) {
        salesInvoicesDB = salesInvoicesDB.filter(i => i.id !== activeSelectedReturnInv.id);
        document.getElementById('returnResultDetails').style.display = 'none';
    } else {
        selectInvoiceForReturn(activeSelectedReturnInv.id);
    }

    saveAllToLocalStorage();
    renderInvoicesLogsTable();
    checkInventoryAlerts();
    filterAndRenderProducts();
    customAlert('تم الإرجاع', 'تمت استعادة المنتج للمخزون وتحديث الفاتورة بنجاح.', 'success');
}

document.getElementById('btnProcessFullReturn').onclick = async () => {
    if (!activeSelectedReturnInv) return;
    const authorized = await requestAdminPin("إرجاع الفاتورة بالكامل");
    if (!authorized) return;

    activeSelectedReturnInv.items.forEach(item => {
        const prod = productsDB.find(p => p.id === item.id);
        if (prod) prod.stock += item.qty;
    });

    logAuditEvent("مرتجع فاتورة بالكامل", `تم إلغاء وإرجاع الفاتورة بالكامل ${activeSelectedReturnInv.id}`);
    salesInvoicesDB = salesInvoicesDB.filter(i => i.id !== activeSelectedReturnInv.id);

    saveAllToLocalStorage();
    document.getElementById('returnResultDetails').style.display = 'none';
    renderInvoicesLogsTable();
    checkInventoryAlerts();
    filterAndRenderProducts();
    customAlert('تم الإرجاع الكلي', 'تم إرجاع جميع عناصر الفاتورة للمخزون وحذف الفاتورة.', 'success');
};

// ===============================================
// 8. الرسوم البيانية والتحليلات
// ===============================================
let chartTopProd = null;
let chartPeakHours = null;
let chartSalesProfit = null;

function renderAnalyticsCharts() {
    const prodMap = {};
    salesInvoicesDB.forEach(inv => {
        inv.items.forEach(it => {
            prodMap[it.name] = (prodMap[it.name] || 0) + it.qty;
        });
    });

    const topLabels = Object.keys(prodMap);
    const topData = Object.values(prodMap);

    const ctx1 = document.getElementById('topProductsChart')?.getContext('2d');
    if (ctx1) {
        if (chartTopProd) chartTopProd.destroy();
        chartTopProd = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: topLabels,
                datasets: [{ label: 'الكميات المباعة', data: topData, backgroundColor: '#3b82f6' }]
            }
        });
    }

    const hoursMap = Array(24).fill(0);
    salesInvoicesDB.forEach(inv => {
        if (inv.rawDate) {
            const h = new Date(inv.rawDate).getHours();
            hoursMap[h] += 1;
        }
    });

    const ctx2 = document.getElementById('peakHoursChart')?.getContext('2d');
    if (ctx2) {
        if (chartPeakHours) chartPeakHours.destroy();
        chartPeakHours = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{ label: 'عدد الفواتير', data: hoursMap, borderColor: '#10b981', fill: false }]
            }
        });
    }

    const salesTotal = salesInvoicesDB.reduce((a, b) => a + b.total, 0);
    const profitTotal = salesInvoicesDB.reduce((a, b) => a + b.profit, 0);

    const ctx3 = document.getElementById('salesProfitChart')?.getContext('2d');
    if (ctx3) {
        if (chartSalesProfit) chartSalesProfit.destroy();
        chartSalesProfit = new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: ['إجمالي المبيعات', 'صافي الأرباح'],
                datasets: [{ data: [salesTotal, profitTotal], backgroundColor: ['#3b82f6', '#10b981'] }]
            }
        });
    }
}

// ===============================================
// 9. سجل حركة الأحداث الحساسة
// ===============================================
function renderAuditLogTable() {
    const tbody = document.getElementById('auditLogTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    auditLogsDB.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><small>${log.timestamp}</small></td>
            <td><strong>${log.user}</strong></td>
            <td><span class="table-badge">${log.action}</span></td>
            <td>${log.details}</td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('btnClearAuditLog').onclick = async () => {
    const authorized = await requestAdminPin("تفريغ سجل العمليات");
    if (!authorized) return;

    const result = await Swal.fire({
        title: 'تفريغ سجل العمليات (Audit Trail)',
        text: 'هل أنت تأكد من تفريغ كافة سجلات الحركة؟ لا يمكن التراجع عن هذا الخيار.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'نعم، قم بالتفريغ',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#ef4444',
        background: '#1e293b', color: '#ffffff'
    });

    if (result.isConfirmed) {
        auditLogsDB = [];
        saveAllToLocalStorage();
        renderAuditLogTable();
        customAlert('تم التفريغ', 'تم تفريغ سجل حركة العمليات الحساسة بنجاح.', 'success');
    }
};

// ===============================================
// 10. المخزن والموردين والعملاء
// ===============================================
function renderInventoryTable() {
    const tbody = document.querySelector('#inventoryTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    productsDB.forEach(p => {
        const max = p.maxStock && p.maxStock > 0 ? p.maxStock : 100;
        const usedQty = Math.max(0, max - p.stock);
        const usagePercent = Math.min(100, Math.round((usedQty / max) * 100));

        let statusColor = 'var(--accent-blue)';
        if (usagePercent > 70) statusColor = 'var(--accent-orange)';
        if (usagePercent > 90) statusColor = 'var(--accent-red)';

        const isLow = p.stock <= p.minStock;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${p.barcode}</code></td>
            <td><strong>${p.name}</strong> ${isLow ? '<span class="badge-low-stock">ناقص</span>' : ''}</td>
            <td style="color:var(--accent-orange);">${(p.costPrice || 0).toFixed(2)} ج.م</td>
            <td style="color:var(--accent-green); font-weight:bold;">${p.price.toFixed(2)} ج.م</td>
            <td>
                <button class="btn-action btn-sm btn-cancel" onclick="changeStock('${p.id}', -1)">-</button>
                <span style="margin: 0 8px; font-weight:bold;">${p.stock}</span>
                <button class="btn-action btn-sm btn-pay" onclick="changeStock('${p.id}', 1)">+</button>
            </td>
            <td><b>${p.minStock}</b></td>
            <td>${p.expiryDate || 'غير محدد'}</td>
            <td>
                <div class="usage-bar-wrapper">
                    <div class="usage-bar-bg"><div class="usage-bar-fill" style="width:${usagePercent}%; background:${statusColor};"></div></div>
                    <span class="usage-text" style="color:${statusColor}">${usagePercent}%</span>
                </div>
            </td>
            <td><button class="btn-action btn-cancel btn-sm" onclick="deleteProduct('${p.id}')"><i class="fa-solid fa-trash"></i> حذف</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function changeStock(id, delta) {
    const p = productsDB.find(prod => prod.id === id);
    if (p) {
        p.stock = Math.max(0, p.stock + delta);
        logAuditEvent("تعديل مخزون", `تعديل مخزون الصنف ${p.name} بمقدار ${delta}`);
        saveAllToLocalStorage();
        renderInventoryTable();
        checkInventoryAlerts();
        filterAndRenderProducts();
    }
}

async function deleteProduct(id) {
    const authorized = await requestAdminPin("حذف منتج من المخزن");
    if (!authorized) return;

    const p = productsDB.find(prod => prod.id === id);
    if (p) logAuditEvent("حذف منتج", `تم حذف المنتج ${p.name}`);
    productsDB = productsDB.filter(p => p.id !== id);
    saveAllToLocalStorage();
    renderInventoryTable();
    checkInventoryAlerts();
    filterAndRenderProducts();
}

document.getElementById('btnOpenAddProduct').onclick = () => { document.getElementById('addProductModal').style.display = 'flex'; };
document.getElementById('btnCancelAddProd').onclick = () => { document.getElementById('addProductModal').style.display = 'none'; };

document.getElementById('btnSaveNewProd').onclick = async () => {
    const name = document.getElementById('newProdName').value;
    const barcode = document.getElementById('newProdBarcode').value;
    const costPrice = parseFloat(document.getElementById('newProdCost').value) || 0;
    const price = parseFloat(document.getElementById('newProdPrice').value);
    const stock = parseInt(document.getElementById('newProdStock').value);
    const minStock = parseInt(document.getElementById('newProdMinStock').value) || 10;
    const expiryDate = document.getElementById('newProdExpiry').value;
    const maxStock = parseInt(document.getElementById('newProdMaxStock').value) || 100;
    const cat = document.getElementById('newProdCat').value;

    if (!name || !barcode || isNaN(price) || isNaN(stock)) return customAlert('خطأ', 'يرجى إكمال البيانات الأساسية', 'error');

    const newProd = { id: Date.now().toString(), name, barcode, costPrice, price, stock, minStock, expiryDate, maxStock, cat };
    productsDB.push(newProd);
    logAuditEvent("إضافة منتج", `إضافة صنف جديد ${name}`);
    saveAllToLocalStorage();

    document.getElementById('addProductModal').style.display = 'none';
    renderInventoryTable();
    checkInventoryAlerts();
    filterAndRenderProducts();
};

function renderSuppliersTable() {
    const tbody = document.querySelector('#suppliersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    suppliersDB.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${s.name}</strong></td>
            <td>${s.phone}</td>
            <td>${s.company}</td>
            <td style="color:${s.balance > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}; font-weight:bold;">${s.balance.toFixed(2)} ج.م</td>
            <td>
                <button class="btn-action btn-pay btn-sm" onclick="paySupplierDebt(${s.id})"><i class="fa-solid fa-hand-holding-dollar"></i> سداد جزء</button>
                <button class="btn-action btn-cancel btn-sm" onclick="deleteSupplier(${s.id})"><i class="fa-solid fa-trash"></i> حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function paySupplierDebt(id) {
    const supplier = suppliersDB.find(s => s.id === id);
    if (!supplier) return;

    if (supplier.balance <= 0) {
        return customAlert('تنبيه', 'لا توجد مديونية مستحقة على هذا المورد.', 'info');
    }

    const { value: amount } = await Swal.fire({
        title: `سداد جزء من مديونية (${supplier.name})`,
        text: `المديونية الحالية: ${supplier.balance.toFixed(2)} ج.م`,
        input: 'number',
        inputLabel: 'المبلغ المدفوع (ج.م):',
        inputPlaceholder: 'ادخل مبلغ الدفعة...',
        showCancelButton: true,
        confirmButtonText: 'تأكيد الخصم',
        cancelButtonText: 'إلغاء',
        background: '#1e293b', color: '#ffffff', confirmButtonColor: '#10b981'
    });

    const paidAmount = parseFloat(amount);
    if (paidAmount && paidAmount > 0) {
        supplier.balance = Math.max(0, supplier.balance - paidAmount);
        
        if (!supplier.history) supplier.history = [];
        supplier.history.push({
            date: new Date().toLocaleString('ar-EG'),
            amount: paidAmount,
            remaining: supplier.balance
        });

        logAuditEvent("سداد مورد", `تم سداد ${paidAmount} ج.م للمورد ${supplier.name}`);
        saveAllToLocalStorage();
        renderSuppliersTable();
        customAlert('تم السداد', `تم تنزيل ${paidAmount.toFixed(2)} ج.م من المديونية بنجاح!`, 'success');
    }
}

async function deleteSupplier(id) {
    const authorized = await requestAdminPin("حذف مورد");
    if (!authorized) return;

    const supp = suppliersDB.find(s => s.id === id);
    if (supp) logAuditEvent("حذف مورد", `تم حذف المورد ${supp.name}`);
    suppliersDB = suppliersDB.filter(s => s.id !== id);
    saveAllToLocalStorage();
    renderSuppliersTable();
}

document.getElementById('btnOpenAddSupplier').onclick = () => { document.getElementById('addSupplierModal').style.display = 'flex'; };
document.getElementById('btnCancelAddSupp').onclick = () => { document.getElementById('addSupplierModal').style.display = 'none'; };

document.getElementById('btnSaveNewSupp').onclick = () => {
    const name = document.getElementById('newSuppName').value;
    const phone = document.getElementById('newSuppPhone').value;
    const company = document.getElementById('newSuppCompany').value;
    const balance = parseFloat(document.getElementById('newSuppBalance').value) || 0;

    if (!name) return customAlert('خطأ', 'يرجى إدخال اسم المورد.', 'error');

    suppliersDB.push({ id: Date.now(), name, phone, company, balance, history: [] });
    logAuditEvent("إضافة مورد", `تمت إضافة المورد الجديد ${name}`);
    saveAllToLocalStorage();
    document.getElementById('addSupplierModal').style.display = 'none';
    renderSuppliersTable();
};

function renderCustomersTable() {
    const tbody = document.querySelector('#customersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    customersDB.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.name}</strong></td>
            <td>${c.phone}</td>
            <td style="color:${c.debt > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}; font-weight:bold;">${c.debt.toFixed(2)} ج.م</td>
            <td><span class="badge" style="position:static; background:var(--accent-blue);">${c.points} نقطة</span></td>
            <td><button class="btn-action btn-cancel btn-sm" onclick="deleteCustomer(${c.id})">حذف</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function deleteCustomer(id) {
    customersDB = customersDB.filter(c => c.id !== id);
    saveAllToLocalStorage();
    renderCustomersTable();
}

document.getElementById('btnOpenAddCustomer').onclick = () => { document.getElementById('addCustomerModal').style.display = 'flex'; };
document.getElementById('btnCancelAddCust').onclick = () => { document.getElementById('addCustomerModal').style.display = 'none'; };

document.getElementById('btnSaveNewCust').onclick = () => {
    const name = document.getElementById('newCustName').value;
    const phone = document.getElementById('newCustPhone').value;
    const debt = parseFloat(document.getElementById('newCustDebt').value) || 0;

    customersDB.push({ id: Date.now(), name, phone, debt, points: 0 });
    saveAllToLocalStorage();
    document.getElementById('addCustomerModal').style.display = 'none';
    renderCustomersTable();
};

// إغلاق الوردية Z-Report
document.getElementById('btnCloseShift').onclick = async () => {
    const authorized = await requestAdminPin("تقفيل الوردية وطباعة Z-Report");
    if (!authorized) return;

    let totalCash = 0, totalCard = 0, grandSales = 0, totalCost = 0, totalNetProfit = 0;

    salesInvoicesDB.forEach(inv => {
        grandSales += inv.total;
        totalCost += (inv.costTotal || 0);
        totalNetProfit += (inv.profit || (inv.total - (inv.costTotal || 0)));

        if (inv.payMethod === 'card') totalCard += inv.total;
        else totalCash += inv.total;
    });

    let zReportHtml = `
        <div style="text-align:right; font-size:0.95rem; line-height:1.6;">
            <p><b>تاريخ تقفيل الوردية:</b> ${new Date().toLocaleString('ar-EG')}</p>
            <p><b>المسؤول:</b> ${currentUser.name}</p>
            <hr style="margin:10px 0; border-color:var(--border-color);">
            <p>\u1F4B0 <b>إجمالي مبيعات النقدية (الكاش بالدرج):</b> ${totalCash.toFixed(2)} ج.م</p>
            <p>\u1F4B3 <b>إجمالي مبيعات الفيزا (Card):</b> ${totalCard.toFixed(2)} ج.م</p>
            <p>\u1F4CA <b>إجمالي المبيعات الكلية:</b> ${grandSales.toFixed(2)} ج.م</p>
            <hr style="margin:10px 0; border-color:var(--border-color);">
            <p>\u1F4E6 <b>إجمالي سعر التكلفة الأصلي للسلع:</b> ${totalCost.toFixed(2)} ج.م</p>
            <p style="color:var(--accent-green); font-size:1.2rem;">\u1F4C8 <b>صافي الأرباح المحققة: ${totalNetProfit.toFixed(2)} ج.م</b></p>
        </div>
    `;

    Swal.fire({
        title: '\u1F4CA تقرير تقفيل الوردية (Z-Report)',
        html: zReportHtml,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'طباعة التقرير وإغلاق',
        cancelButtonText: 'إلغاء',
        background: '#1e293b', color: '#ffffff', confirmButtonColor: '#10b981'
    }).then((result) => {
        if (result.isConfirmed) {
            logAuditEvent("تقفيل وردية", `تم تقفيل الوردية بإجمالي مبيعات ${grandSales} ج.م`);
            window.print();
        }
    });
};

// النسخ الاحتياطي والاسترجاع
document.getElementById('btnBackupData').onclick = () => {
    const data = { productsDB, customersDB, suppliersDB, salesInvoicesDB, employeesDB, attendanceDB, auditLogsDB, heldInvoices };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup-hyperpos-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
};

document.getElementById('btnRestoreData').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const restored = JSON.parse(event.target.result);
                if (restored.productsDB) productsDB = restored.productsDB;
                if (restored.customersDB) customersDB = restored.customersDB;
                if (restored.suppliersDB) suppliersDB = restored.suppliersDB;
                if (restored.salesInvoicesDB) salesInvoicesDB = restored.salesInvoicesDB;
                if (restored.employeesDB) employeesDB = restored.employeesDB;
                if (restored.attendanceDB) attendanceDB = restored.attendanceDB;
                if (restored.auditLogsDB) auditLogsDB = restored.auditLogsDB;
                saveAllToLocalStorage();
                location.reload();
            } catch (err) {
                customAlert('خطأ', 'تنسيق الملف غير صحيح', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
};