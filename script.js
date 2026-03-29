let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let editingId = null;
let selectedType = 'income';
let chart = null;

const $ = id => document.getElementById(id);

function save() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
}

function formatMoney(n) {
    return '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function updateSummary() {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    $('totalIncome').textContent = formatMoney(income);
    $('totalExpense').textContent = formatMoney(expense);
    $('balance').textContent = (balance < 0 ? '-' : '') + formatMoney(balance);
    $('balance').style.color = balance >= 0 ? '#111' : '#c0392b';
}

function updateFilters() {
    const catFilter = $('filterCategory');
    const monthFilter = $('filterMonth');
    const currentCat = catFilter.value;
    const currentMonth = monthFilter.value;

    const categories = [...new Set(transactions.map(t => t.category))].sort();
    catFilter.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        catFilter.appendChild(opt);
    });
    catFilter.value = categories.includes(currentCat) ? currentCat : 'all';

    const months = [...new Set(transactions.map(t => t.date.substring(0, 7)))].sort().reverse();
    monthFilter.innerHTML = '<option value="all">All Time</option>';
    months.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        const d = new Date(m + '-01');
        opt.textContent = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        monthFilter.appendChild(opt);
    });
    monthFilter.value = months.includes(currentMonth) ? currentMonth : 'all';
}

function getFiltered() {
    let list = [...transactions];
    const type = $('filterType').value;
    const cat = $('filterCategory').value;
    const month = $('filterMonth').value;

    if (type !== 'all') list = list.filter(t => t.type === type);
    if (cat !== 'all') list = list.filter(t => t.category === cat);
    if (month !== 'all') list = list.filter(t => t.date.startsWith(month));

    return list.sort((a, b) => b.date.localeCompare(a.date));
}

function render() {
    const list = getFiltered();
    const container = $('transactions');
    container.innerHTML = '';

    if (list.length === 0) {
        $('emptyState').classList.add('show');
    } else {
        $('emptyState').classList.remove('show');
    }

    list.forEach(t => {
        const div = document.createElement('div');
        div.className = 'transaction';
        const sign = t.type === 'income' ? '+' : '-';
        div.innerHTML = `
            <div class="t-left">
                <span class="t-desc">${t.description}</span>
                <span class="t-meta">${t.category} · ${t.date}</span>
            </div>
            <div class="t-right">
                <span class="t-amount ${t.type}">${sign}${formatMoney(t.amount)}</span>
                <button class="t-delete" onclick="del('${t.id}')">Delete</button>
            </div>
        `;
        container.appendChild(div);
    });

    updateSummary();
    updateFilters();
    updateChart();
}

function updateChart() {
    const months = {};
    transactions.forEach(t => {
        const m = t.date.substring(0, 7);
        if (!months[m]) months[m] = { income: 0, expense: 0 };
        months[m][t.type] += t.amount;
    });

    const sorted = Object.keys(months).sort();
    const labels = sorted.map(m => {
        const d = new Date(m + '-01');
        return d.toLocaleString('en-US', { month: 'short' });
    });

    const incomeData = sorted.map(m => months[m].income);
    const expenseData = sorted.map(m => months[m].expense);

    if (chart) chart.destroy();

    if (sorted.length === 0) {
        $('chart').style.display = 'none';
        return;
    }

    $('chart').style.display = 'block';
    chart = new Chart($('chart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(39, 174, 96, 0.7)',
                    borderRadius: 4
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(192, 57, 43, 0.7)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 12 } } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function openDialog() {
    $('dialogTitle').textContent = 'Add Transaction';
    $('tDesc').value = '';
    $('tAmount').value = '';
    $('tCategory').value = 'Salary';
    $('tDate').value = new Date().toISOString().split('T')[0];
    selectedType = 'income';
    $('typeIncome').classList.add('active');
    $('typeExpense').classList.remove('active');
    $('overlay').classList.add('open');
}

function closeDialog() {
    $('overlay').classList.remove('open');
    $('tDesc').classList.remove('input-error');
}

function saveTransaction() {
    const desc = $('tDesc').value.trim();
    if (!desc) {
        $('tDesc').classList.add('input-error');
        return;
    }
    $('tDesc').classList.remove('input-error');

    transactions.push({
        id: uid(),
        type: selectedType,
        description: desc,
        amount: parseFloat($('tAmount').value) || 0,
        category: $('tCategory').value,
        date: $('tDate').value || new Date().toISOString().split('T')[0]
    });

    save();
    render();
    closeDialog();
}

function del(id) {
    if (confirm('Delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        save();
        render();
    }
}

$('addBtn').addEventListener('click', openDialog);
$('closeDialog').addEventListener('click', closeDialog);
$('overlay').addEventListener('click', e => { if (e.target === $('overlay')) closeDialog(); });
$('saveBtn').addEventListener('click', saveTransaction);
$('filterType').addEventListener('change', render);
$('filterCategory').addEventListener('change', render);
$('filterMonth').addEventListener('change', render);

document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedType = btn.dataset.type;
    });
});

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDialog(); });

render();
