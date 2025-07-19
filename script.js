// script.js (V5.1 基础上应用 TradingView 色调)

const apiBaseUrl = '/api';

async function fetchData(endpoint) {
    try {
        const response = await fetch(`${apiBaseUrl}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching data from ${endpoint}:`, error);
        throw error;
    }
}

function createButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
}

function renderTreemap(data) {
    const container = d3.select("#heatmap-container");
    container.html(""); // Clear previous content

    const width = container.node().getBoundingClientRect().width;
    const height = container.node().getBoundingClientRect().height;

    const root = d3.hierarchy({ children: data })
        .sum(d => d.market_cap)
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .size([width, height])
        .padding(1)
        (root);

    // ===================================================================
    // ==================== [核心修改在这里] ===========================
    // 将颜色范围替换为 TradingView 的专业色调
    // ===================================================================
    const colorScale = d3.scaleLinear()
        .domain([-3, 0, 3])
        .range(["#D9443A", "#434651", "#22965D"]) // 专业红 -> 暗灰 -> 专业绿
        .clamp(true);

    const cell = container.selectAll("g")
        .data(root.leaves())
        .enter().append("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    cell.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .style("stroke", "#fff")
        .attr("fill", d => colorScale(d.change_percentage));

    cell.append("text")
        .attr("x", 4)
        .attr("y", 14)
        .text(d => d.data.ticker)
        .attr("font-size", "12px")
        .attr("fill", "white");

    cell.append("text")
        .attr("x", 4)
        .attr("y", 28)
        .text(d => `${d.data.change_percentage.toFixed(2)}%`)
        .attr("font-size", "10px")
        .attr("fill", "white");
}

async function renderHomePage() {
    try {
        document.getElementById('heatmap-title').textContent = "美股市场 (BETA)";
        document.getElementById('back-button').style.display = 'none';

        const stocks = await fetchData('/stocks');
        if (!stocks || stocks.length === 0) {
            throw new Error("No stock data returned from API.");
        }
        renderTreemap(stocks);

        const sectors = [...new Set(stocks.map(stock => stock.sector))];
        const buttonsContainer = document.getElementById('sector-buttons');
        buttonsContainer.innerHTML = '';
        sectors.forEach(sector => {
            buttonsContainer.appendChild(createButton(sector, () => router('sector', sector)));
        });

    } catch (error) {
        const errorMsg = "获取市场数据失败";
        document.getElementById('heatmap-container').textContent = errorMsg;
        console.error("Render HomePage Error:", error);
        throw new Error(errorMsg);
    }
}

async function renderSectorPage(sector) {
    document.getElementById('heatmap-title').textContent = sector;
    document.getElementById('back-button').style.display = 'inline-block';
    
    const stocks = await fetchData(`/stocks?sector=${encodeURIComponent(sector)}`);
    renderTreemap(stocks);
}

async function router(page, param) {
    const sectorButtons = document.getElementById('sector-buttons');
    sectorButtons.style.display = 'block';

    if (page === 'home') {
        await renderHomePage();
    } else if (page === 'sector') {
        sectorButtons.style.display = 'none';
        await renderSectorPage(param);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('back-button').addEventListener('click', () => router('home'));
    await router('home');
});