let currentRate = null;
let chartData = [];
let exchangeRateChart = null;
let selectedBarIndex = null;

async function fetchCurrentRate() {
    try {
        const response = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
        const data = await response.json();
        currentRate = data.Valute.THB.Value / data.Valute.THB.Nominal;
        document.getElementById('result').textContent = `Текущий курс: 1 THB = ${currentRate.toFixed(2)} RUB`;
        updateCurrencyOptions();
    } catch (error) {
        console.error('Ошибка при получении курса:', error);
        document.getElementById('result').textContent = 'Не удалось загрузить текущий курс. Попробуйте позже.';
    }
}

function updateCurrencyOptions() {
    const fromCurrency = document.getElementById('from-currency');
    const toCurrency = document.getElementById('to-currency');

    if (fromCurrency.value === toCurrency.value) {
        if (fromCurrency.value === 'RUB') {
            toCurrency.value = 'THB';
        } else {
            toCurrency.value = 'RUB';
        }
    }
}

function convertCurrency() {
    if (!currentRate) {
        alert('Курс валют не загружен. Пожалуйста, подождите...');
        return;
    }

    const amount = parseFloat(document.getElementById('amount').value);
    if (isNaN(amount)) {
        alert('Введите корректную сумму');
        return;
    }

    const fromCurrency = document.getElementById('from-currency').value;
    const toCurrency = document.getElementById('to-currency').value;

    let result;
    if (fromCurrency === 'RUB' && toCurrency === 'THB') {
        result = amount / currentRate;
        document.getElementById('result').textContent = `${amount.toFixed(2)} RUB = ${result.toFixed(2)} THB`;
    } else if (fromCurrency === 'THB' && toCurrency === 'RUB') {
        result = amount * currentRate;
        document.getElementById('result').textContent = `${amount.toFixed(2)} THB = ${result.toFixed(2)} RUB`;
    }
}

async function fetchLast61DaysData() {
    try {
        document.getElementById('selected-bar-info').textContent = 'Загрузка данных...';
        
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 60);

        const dateRange = getDateRange(startDate, endDate);
        const promises = dateRange.map(date =>
            fetch(`https://www.cbr-xml-daily.ru/archive/${date}/daily_json.js`)
                .then(response => {
                    if (!response.ok) throw new Error('Данные не найдены');
                    return response.json();
                })
                .then(data => {
                    const rate = data.Valute.THB.Value / data.Valute.THB.Nominal;
                    return {
                        date: new Date(date),
                        rate: rate,
                        formattedDate: formatDate(new Date(date))
                    };
                })
                .catch(error => {
                    console.log(`Данные за ${date} не найдены`);
                    return {
                        date: new Date(date),
                        rate: null,
                        formattedDate: formatDate(new Date(date))
                    };
                })
        );

        const results = await Promise.all(promises);
        chartData = results.filter(item => item.rate !== null);

        chartData.sort((a, b) => a.date - b.date);

        createChart();
        document.getElementById('selected-bar-info').textContent = 'Выберите дату на графике для просмотра курса';
    } catch (error) {
        console.error('Ошибка при получении исторических данных:', error);
        document.getElementById('selected-bar-info').textContent = 'Не удалось загрузить исторические данные. Попробуйте позже.';
    }
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function getDateRange(startDate, endDate) {
    const dateArray = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        dateArray.push(`${year}/${month}/${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateArray;
}

function createChart() {
    const ctx = document.getElementById('exchange-rate-chart').getContext('2d');

    const labels = chartData.map(item => item.formattedDate);
    const data = chartData.map(item => item.rate);

    if (exchangeRateChart) {
        exchangeRateChart.destroy();
    }

    exchangeRateChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Курс THB (рублей за 1 бат)',
                data: data,
                backgroundColor: chartData.map((item, index) =>
                    index === selectedBarIndex ? '#0092cc' : 'rgba(0, 60, 109, 0.7)'
                ),
                borderColor: chartData.map((item, index) =>
                    index === selectedBarIndex ? '#0092cc' : 'rgba(0, 60, 109, 1)'
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Курс (RUB/THB)',
                        color: '#003c6d'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Дата',
                        color: '#003c6d'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#003c6d',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function(context) {
                            const data = chartData[context.dataIndex];
                            return `${data.formattedDate}: ${context.parsed.y.toFixed(2)} RUB`;
                        }
                    }
                }
            },
            onClick: (e, activeEls) => {
                if (activeEls.length > 0) {
                    const index = activeEls[0].index;
                    selectedBarIndex = index;
                    const selectedData = chartData[index];
                    document.getElementById('selected-bar-info').textContent =
                        `Курс на ${selectedData.formattedDate}: ${selectedData.rate.toFixed(2)} RUB`;

                    exchangeRateChart.data.datasets[0].backgroundColor = chartData.map((item, i) =>
                        i === selectedBarIndex ? '#F08080' : 'rgba(0, 60, 109, 0.7)'
                    );
                    exchangeRateChart.data.datasets[0].borderColor = chartData.map((item, i) =>
                        i === selectedBarIndex ? '#F08080' : 'rgba(0, 60, 109, 1)'
                    );
                    exchangeRateChart.update();
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchCurrentRate();

    document.getElementById('convert-btn').addEventListener('click', convertCurrency);
    document.getElementById('from-currency').addEventListener('change', updateCurrencyOptions);
    document.getElementById('to-currency').addEventListener('change', updateCurrencyOptions);

    fetchLast61DaysData();
});