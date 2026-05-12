console.log('D3 Version:', d3.version);

let mapData = []
let selectedYear = 2020

let r_postCommentData = []
const r_controlSeries = []
let r_postChartYear = null;
let section2RevealObserverInitialized = false;

const parseDate = d3.timeParse("%Y-%m-%d");
const section2StartDate = parseDate("2011-01-01");
const r_allSubreddits = [
    // "COVID19_support",
    "addiction",
    "adhd",
    "anxiety",
    "autism",
    "bipolar",
    "bpd",
    "depression",
    // "healthanxiety",
    "lonely",
    // "ForeverAlone",
    // "mentalhealth",
    "ptsd",
    "Psychosis",
    "schizophrenia",
    "socialanxiety",
    "suicidewatch"
];

const r_main_subs = [
    'depression',
    'lonely',
    'suicidewatch'
]
const r_other_subs = [
    "adhd",
    "autism",
    "anxiety",
    "bpd",
    "bipolar",
    "addiction",






    // "healthanxiety",
    // "ForeverAlone",
    // "mentalhealth",
    "ptsd",
    "Psychosis",
    "schizophrenia",
    "socialanxiety"
]

const r_ctrl_subs = [
    "funny",
    "news",
    "gaming",
    "worldnews",
    "todayilearned",
    // "askreddit"
];

const r_control_file_subs = new Map([
    ["./data/funny_wnews_gaming__posts_counts.csv", ["funny", "gaming", "worldnews"]],
    ["./data/news_tdil_post_counts.csv", ["news", "todayilearned"]],
    ["./data/askreddit_post_counts.csv", ["askreddit"]]
]);
const r_ctrl_sub_set = new Set(r_ctrl_subs.map(subreddit => String(subreddit).toLowerCase()));
const r_control_files = Array.from(r_control_file_subs)
    .filter(([, subreddits]) => subreddits.some(subreddit => r_ctrl_sub_set.has(String(subreddit).toLowerCase())))
    .map(([file]) => file);


const t = 1000; // 1000ms = 1 second

//make margins
const margin = {top: 40, right: 40, bottom: 60, left: 60};
const width = 1200 - margin.left - margin.right;
const height = 700 - margin.top - margin.bottom;
const svgWidth = width + margin.left + margin.right;
const svgHeight = height + margin.top + margin.bottom;
const redditWidth = 1200 - margin.left - 160;
const redditHeight = 700 - margin.top - margin.bottom;
const redditSvgWidth = redditWidth + margin.left + 160;
const redditSvgHeight = redditHeight + margin.top + margin.bottom;

const cleanID = d => String(d).replace(/^0+/, "");

/** Parsed rows for Section 3 (NHANES depression story); loaded once. */
let nhanesStoryRowsPromise = null;

const NHANES_AGE_BANDS = [
    { label: "18–29", lo: 18, hi: 30 },
    { label: "30–44", lo: 30, hi: 45 },
    { label: "45–59", lo: 45, hi: 60 },
    { label: "60–80", lo: 60, hi: 81 },
];

function nhanesAgeBand(ageYears) {
    if (!Number.isFinite(ageYears) || ageYears < 18) {
        return null;
    }
    for (const b of NHANES_AGE_BANDS) {
        if (ageYears >= b.lo && ageYears < b.hi) {
            return b.label;
        }
    }
    return null;
}

function loadNhanesForStory() {
    if (nhanesStoryRowsPromise) {
        return nhanesStoryRowsPromise;
    }
    nhanesStoryRowsPromise = d3.csv("./data/combined_NHANES.csv", d => {
        const g = d.Gender === "" || d.Gender == null ? NaN : +d.Gender;
        const risk = d.depression_risk_number === "" || d.depression_risk_number == null
            ? NaN
            : +d.depression_risk_number;
        const ageYears = d.Age_in_years_at_screening === "" || d.Age_in_years_at_screening == null
            ? NaN
            : +d.Age_in_years_at_screening;
        return { gender: g, ageYears, depressionRisk: risk };
    }).then(rows => rows.filter(r =>
        Number.isFinite(r.depressionRisk) && Number.isFinite(r.ageYears) && r.ageYears >= 18
    ));
    return nhanesStoryRowsPromise;
}


const subColor = d3.scaleOrdinal()
    .domain(r_other_subs)
    .range([
        "#b99e58",
            "#f9c74f",
            "#f9a13e",
            "#f08c36",
            "#ba6146",
            "#ad5f4e",
            "#97514b",
            "#a62825",
            "#7c1f1e",
            "#5b1618"
    ]);

const mainSubColor = d3.scaleOrdinal()
    .domain(r_main_subs)
    .range([
        "#0047ff",
        "#0085ff",
        "#00b8d9"
    ]);

const r_ctrl_colors = d3.scaleOrdinal()
    .domain(r_ctrl_subs)
    .range([
        "#5296dd",
        "#92bddf",
        "	#ffffff",
        "	#afafaf",
        "#ff6314"
    ])

const subredditColor = subreddit => r_main_subs.includes(subreddit)
    ? mainSubColor(subreddit)
    : subColor(subreddit);

const subredditStrokeWidth = subreddit => r_main_subs.includes(subreddit) ? 4.7 : 1.8;

const formatDate = d3.timeFormat("%b %d, %Y");
const formatWeekday = d3.timeFormat("%A");
const formatComma = d3.format(",");
const subredditColumnKey = subreddit => subreddit.toLowerCase();

function showTooltip(event, content) {
    d3.select("#tooltip")
        .style("display", "block")
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`)
        .html(content);
}

function hideTooltip() {
    d3.select("#tooltip")
        .style("display", "none");
}

function setupSection2ScrollReveal() {
    if (section2RevealObserverInitialized) {
        return;
    }

    const scrolly = document.querySelector("#section2-scrolly");
    const stage = document.querySelector("#section2-stage");
    const compareScene = document.querySelector("#section2-compare-scene");
    const postScene = document.querySelector("#section2-post-scene");
    const shareScene = document.querySelector("#section2-share-scene");
    const progressFill = document.querySelector(".section2-progress-fill");
    const backButton = document.querySelector("#section2-back");
    const nextButton = document.querySelector("#section2-next");
    const descTitle = document.querySelector("#section2-desc-title");
    const descBody = document.querySelector("#section2-desc-body");
    if (!scrolly || !stage || !compareScene || !postScene || !shareScene || !progressFill || !backButton || !nextButton || !descTitle || !descBody) {
        return;
    }

    const scenes = [compareScene, postScene, shareScene];
    const sceneCopy = [
        {
            title: "The Steady Growth of Mental Health Related Communities",
            body: "lorem ipsum"
        },
        {
            title: "The Domination of Depression Related Communities",
            body: "lorem ipsum"
        },
        {
            title: "The Breakdown of the Domination",
            body: "lorem ipsum"
        }
    ];
    let activeIndex = 0;

    const setActiveScene = index => {
        activeIndex = Math.max(0, Math.min(scenes.length - 1, index));

        scenes.forEach((scene, sceneIndex) => {
            scene.classList.toggle("is-active", sceneIndex === activeIndex);
        });

        const copy = sceneCopy[activeIndex];
        descTitle.textContent = copy.title;
        descBody.textContent = copy.body;
        backButton.disabled = activeIndex === 0;
        nextButton.disabled = activeIndex === scenes.length - 1;
        progressFill.style.width = `${((activeIndex + 1) / scenes.length) * 100}%`;
    };

    backButton.addEventListener("click", () => setActiveScene(activeIndex - 1));
    nextButton.addEventListener("click", () => setActiveScene(activeIndex + 1));
    setActiveScene(0);
    section2RevealObserverInitialized = true;
}

//load data after page is loaded
function init(){

    d3.csv("./data/PLACES_Data_Depression.csv", function(d){
        return {
        // Besides converting the types, we also simpilify the variable names here.
        year: +d.Year,
        state: d.StateDesc,
        stateAbbr: d.StateAbbr,
        county: d.LocationName,
        countyID: d.LocationID,
        measure: d.Measure,
        valueType: d.Data_Value_Type,
        value: +d.Data_Value
     }
    })
    .then(async data => {
           // console.log(data)
            mapData = data
            console.log(mapData)

            await createMapVis()

            d3.selectAll('input[name="year"]').on("change", function () {
                selectedYear = +this.value;
                updateMap();
            });

        })
    .catch(error => console.error('Error loading data:', error));


    const postCommentPromise = d3.csv("./data/05t25post_com_count.csv", function(d){
        const row = { date: parseDate(d.date) };
        r_allSubreddits.forEach(subreddit => {
            const key = subredditColumnKey(subreddit);
            const posts = +(d[`${key}_posts`] || 0);
            const comments = +(d[`${key}_coms`] || 0);
            row[subreddit] = {
                posts,
                comments,
                total: posts + comments
            };
        });
        return row;
    })
    .then(data => {
        r_postCommentData = data.filter(d => d.date && d.date >= section2StartDate)
        console.log(r_postCommentData)
    })
    .catch(error => console.error('Error loading post/comment count data:', error));

    const controlPromise = Promise.all(r_control_files.map(file => d3.csv(file)))
        .then(fileRows => {
            const controlMap = new Map();

            fileRows.flat().forEach(row => {
                const date = parseDate(row.date);
                if (!date || date < section2StartDate) {
                    return;
                }

                Object.keys(row)
                    .filter(key => key.endsWith("_posts"))
                    .forEach(key => {
                        const subreddit = key.replace(/_posts$/, "");
                        if (!r_ctrl_sub_set.has(subreddit)) {
                            return;
                        }

                        if (!controlMap.has(subreddit)) {
                            controlMap.set(subreddit, []);
                        }

                        controlMap.get(subreddit).push({
                            date,
                            posts: +(row[key] || 0)
                        });
                    });
            });

            r_controlSeries.splice(0, r_controlSeries.length, ...Array.from(controlMap, ([subreddit, values]) => ({
                sub: subreddit,
                label: `r/${subreddit}`,
                values: values.sort((a, b) => a.date - b.date)
            })).sort((a, b) => a.label.localeCompare(b.label)));
        })
        .catch(error => console.error('Error loading control post count data:', error));

    Promise.all([postCommentPromise, controlPromise]).then(() => {
        createRedVis()
        setupSection2ScrollReveal()
    });

    createDepressionGenderVis();
    setupDepressionStoryContinue();
}


//map county id cleaner
const cleanIDMap = d => String(d).padStart(5, "0");

//map helper
function getCurrentValueMap() {
    const filtered = mapData.filter(d => +d.year === +selectedYear);

    return new Map(
        filtered.map(d => [cleanIDMap(d.countyID), d.value])
    );
}

//map function adapted from https://observablehq.com/@d3/choropleth/2
async function createMapVis() {

    const color = d3.scaleQuantize([10, 35], d3.schemePurples[7].slice(2));
    const projection = d3.geoAlbersUsa();
    const path = d3.geoPath(projection);

    const us = await fetch("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json")
        .then(r => r.json());

    const counties = topojson.feature(us, us.objects.counties);

    projection.fitSize(
        [width + margin.left + margin.right - 180,
         height + margin.top + margin.bottom - 50],
        counties
    );

    projection.translate([
        projection.translate()[0],
        projection.translate()[1] + 20
    ]);

    const valuemap = getCurrentValueMap();

    const states = topojson.feature(us, us.objects.states);
    const statemesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b);

    let defs = mapsvg.select("defs");
    if (defs.empty()) {
        defs = mapsvg.append("defs");
    }

    defs.select("#diagonalHatch").remove();

    const pattern = defs.append("pattern")
        .attr("id", "diagonalHatch")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 6)
        .attr("height", 6);

    // background fill for no-data hatch
    pattern.append("rect")
        .attr("width", 6)
        .attr("height", 6)
        .attr("fill", "#6a6767");

    // real diagonal line hatch
    pattern.append("line")
        .attr("x1", 0)
        .attr("y1", 6)
        .attr("x2", 6)
        .attr("y2", 0)
        .attr("stroke", "#292929")
        .attr("stroke-width", 1);

    //map layers
    const zoomLayer = mapsvg.append("g");

    zoomLayer.append("g")
        .selectAll("path")
        .data(counties.features)
        .join("path")
        .attr("class", "county")
        .attr("d", path)
        .attr("data-value", d => {
            const v = valuemap.get(cleanIDMap(d.id));
            return v != null ? v : "";
        })
        .attr("fill", d => {
            const v = valuemap.get(cleanIDMap(d.id));
            return v != null ? color(v) : "url(#diagonalHatch)";
        })
        .style("stroke", "#fff")
        .style("stroke-width", 0.2)
        .on("mouseenter", function(event, d) {

            d3.select(this)
                .raise()
                .classed("county-hover", true);

            const v = d3.select(this).attr("data-value");

            showTooltip(event, `
                <strong>County:</strong> ${d.properties.name}<br>
                <strong>Depression Rate:</strong> ${
                    v !== "" ? `${v}%` : "No data"
                }
            `);
        })
        .on("mousemove", function(event) {
            d3.select("#tooltip")
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseleave", function() {
            hideTooltip();
            d3.select(this).classed("county-hover", false);
        });

    // state borders
    zoomLayer.append("path")
        .datum(statemesh)
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 0.2)
        .attr("d", path);

    //legend
    const legendBoxSize = 18;
    const legendSpacing = 26;

    const legendData = color.range();

    const legendWidth = 140;
    const legendHeight = legendData.length * legendSpacing + 40;

    const legend = mapsvg.append("g")
        .attr("transform",
            `translate(${svgWidth - legendWidth - 30}, ${svgHeight - legendHeight - 25})`
        );

    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .attr("rx", 6)
        .attr("fill", "white")
        .attr("opacity", 0.9)
        .attr("stroke", "#ccc");

    legend.append("text")
        .attr("x", 12)
        .attr("y", 22)
        .text("Prevalence (%)")
        .style("font-size", "16px")
        .style("font-weight", "bold");

    legend.selectAll("rect.legend-box")
        .data(legendData)
        .join("rect")
        .attr("x", 12)
        .attr("y", (d, i) => 35 + i * legendSpacing)
        .attr("width", legendBoxSize)
        .attr("height", legendBoxSize)
        .attr("fill", d => d);

    legend.selectAll(".legend-label")
        .data(legendData)
        .join("text")
        .attr("x", 40)
        .attr("y", (d, i) => 35 + i * legendSpacing + 14)
        .text((d, i) => {
            const domain = color.domain();
            const step = (domain[1] - domain[0]) / color.range().length;
            const start = domain[0] + i * step;
            const end = start + step;
            return `${Math.round(start)}–${Math.round(end)}%`;
        })
        .style("font-size", "12px");

    //zoom
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .translateExtent([[0, 0], [svgWidth, svgHeight]])
        .on("zoom", (event) => {
            zoomLayer.attr("transform", event.transform);
        });

    d3.select("#map-vis svg").call(zoom);

    return mapsvg.node();
}

function updateMap() {

    const color = d3.scaleQuantize([10, 35], d3.schemePurples[7].slice(2));

    const filtered = mapData.filter(d => +d.year === +selectedYear);

    const valuemap = new Map(
        filtered.map(d => [cleanIDMap(d.countyID), d.value])
    );

    mapsvg.selectAll("path.county")
        .transition()
        .duration(10)
        .attr("data-value", d => {
            const v = valuemap.get(cleanIDMap(d.id));
            return v != null ? v : "";
        })
        .attr("fill", d => {
            const v = valuemap.get(cleanIDMap(d.id));
            return v != null
                ? color(v)
                : "url(#diagonalHatch)";
        });
}


function createRedVis() {
    redditsvg.selectAll("*").remove();
    d3.select("#reddit-control-vis").selectAll("*").remove();
    d3.select("#reddit-contribution-vis").selectAll("*").remove();

    const availableDates = r_postCommentData
        .map(d => d.date)
        .filter(Boolean)
        .sort((a, b) => a - b);

    if (!availableDates.length) {
        redditsvg.append("text")
            .attr("x", redditWidth / 2)
            .attr("y", redditHeight / 2)
            .attr("text-anchor", "middle")
            .style("fill", "#666")
            .text("No post/comment count data available.");
        return;
    }

    const fullDateRange = [availableDates[0], availableDates[availableDates.length - 1]];
    const panelWidth = redditWidth;
    const panelHeight = redditHeight;
    const quarterLabel = date => `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
    const quarterStart = date => new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
    const toQuarterlyValues = values => {
        const byQuarter = d3.rollups(
            values,
            rows => ({
                date: quarterStart(rows[0].date),
                posts: d3.sum(rows, d => d.posts),
                comments: d3.sum(rows, d => d.comments)
            }),
            d => +quarterStart(d.date)
        );

        return byQuarter
            .map(([, value]) => value)
            .sort((a, b) => a.date - b.date);
    };

    const toQuarterlyPostValues = values => {
        const byQuarter = d3.rollups(
            values,
            rows => ({
                date: quarterStart(rows[0].date),
                posts: d3.sum(rows, d => d.posts)
            }),
            d => +quarterStart(d.date)
        );

        return byQuarter
            .map(([, value]) => value)
            .sort((a, b) => a.date - b.date);
    };

    const activityBySubreddit = r_allSubreddits
        .map(subreddit => {
            const dailyValues = r_postCommentData.map(row => ({
                date: row.date,
                posts: row[subreddit]?.posts ?? 0,
                comments: row[subreddit]?.comments ?? 0
            }));

            return {
                sub: subreddit,
                values: toQuarterlyValues(dailyValues)
            };
        });

    const drawControlComparisonChart = () => {
        const container = d3.select("#reddit-control-vis");
        container.selectAll("*").remove();

        const combinedMentalDaily = r_postCommentData.map(row => ({
            date: row.date,
            posts: d3.sum(r_allSubreddits, subreddit => row[subreddit]?.posts ?? 0)
        }));

        const comparisonSeries = [
            ...r_controlSeries.map(series => ({
                label: series.label,
                color: r_ctrl_colors(series.sub),
                values: toQuarterlyPostValues(series.values),
                strokeWidth: 3
            })),
            {
                label: "Selected mental-health subreddits",
                color: "#2a2a7b",
                values: toQuarterlyPostValues(combinedMentalDaily),
                strokeWidth: 5
            }
        ];

        const allValues = comparisonSeries.flatMap(series => series.values);
        if (!allValues.length) {
            container.append("p")
                .style("color", "#666")
                .text("No control comparison data available.");
            return;
        }

        const comparisonMargin = { top: 40, right: 210, bottom: 60, left: 78 };
        const comparisonWidth = redditSvgWidth - comparisonMargin.left - comparisonMargin.right;
        const comparisonHeight = redditSvgHeight - comparisonMargin.top - comparisonMargin.bottom;
        const comparisonSvgHeight = redditSvgHeight;

        const svg = container.append("svg")
            .attr("width", redditSvgWidth)
            .attr("height", comparisonSvgHeight)
            .attr("viewBox", `0 0 ${redditSvgWidth} ${comparisonSvgHeight}`);

        const chart = svg.append("g")
            .attr("transform", `translate(${comparisonMargin.left},${comparisonMargin.top})`);

        const x = d3.scaleTime()
            .domain(fullDateRange)
            .range([0, comparisonWidth]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(allValues, d => d.posts) ?? 0])
            .nice()
            .range([comparisonHeight, 0]);

        const line = d3.line()
            .defined(d => Number.isFinite(d.posts))
            .x(d => x(d.date))
            .y(d => y(d.posts));

        chart.append("g")
            .attr("transform", `translate(0,${comparisonHeight})`)
            .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")))
            .selectAll("text")
            .style("font-size", "9px")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end");

        chart.append("g")
            .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("~s")));

        chart.append("text")
            .attr("x", -comparisonHeight / 2)
            .attr("y", -54)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("Posts per quarter");

        const seriesGroups = chart.selectAll(".control-comparison-line")
            .data(comparisonSeries)
            .enter()
            .append("g")
            .attr("class", "control-comparison-line");

        seriesGroups.append("path")
            .attr("fill", "none")
            .attr("stroke", d => d.color)
            .attr("stroke-width", d => d.strokeWidth)
            .attr("d", d => line(d.values));

        seriesGroups.selectAll(".comparison-hover-point")
            .data(d => d.values.map(v => ({ ...v, label: d.label, color: d.color })))
            .enter()
            .append("circle")
            .attr("class", "comparison-hover-point")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d.posts))
            .attr("r", 4)
            .attr("fill", d => d.color)
            .attr("opacity", 0)
            .on("mouseenter", function() {
                d3.select(this).attr("opacity", 1);
            })
            .on("mousemove", (event, d) => {
                showTooltip(event, `
                    <strong>${d.label}</strong><br>
                    Quarter: ${quarterLabel(d.date)}<br>
                    Posts: ${formatComma(d.posts)}
                `);
            })
            .on("mouseleave", function() {
                d3.select(this).attr("opacity", 0);
                hideTooltip();
            });

        const comparisonLabelGap = 15;
        const comparisonLabels = comparisonSeries.map(series => {
            const value = [...series.values].reverse().find(d => Number.isFinite(d.posts));
            return value
                ? {
                    ...series,
                    value,
                    desiredY: y(value.posts) + 4
                }
                : null;
        }).filter(Boolean)
            .sort((a, b) => a.desiredY - b.desiredY);

        comparisonLabels.forEach((label, index) => {
            label.labelY = index === 0
                ? Math.max(10, label.desiredY)
                : Math.max(label.desiredY, comparisonLabels[index - 1].labelY + comparisonLabelGap);
        });

        for (let index = comparisonLabels.length - 1; index >= 0; index -= 1) {
            const maxY = index === comparisonLabels.length - 1
                ? comparisonHeight - 6
                : comparisonLabels[index + 1].labelY - comparisonLabelGap;
            comparisonLabels[index].labelY = Math.min(comparisonLabels[index].labelY, maxY);
        }

        chart.selectAll(".comparison-end-label")
            .data(comparisonLabels)
            .enter()
            .append("text")
            .attr("class", "comparison-end-label")
            .attr("x", d => x(d.value.date) + 8)
            .attr("y", d => d.labelY)
            .attr("fill", d => d.color)
            .style("font-size", "12px")
            .style("font-weight", "700")
            .text(d => d.label);
    };

    const getYearRange = year => {
        if (year == null) {
            return fullDateRange;
        }
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59, 999);
        return [
            start < fullDateRange[0] ? fullDateRange[0] : start,
            end > fullDateRange[1] ? fullDateRange[1] : end
        ];
    };

    const drawActivityChart = ({ group, title, metric, selectedYear, setYear, xOffset }) => {
        const chart = group.append("g")
            .attr("transform", `translate(${xOffset},0)`);
        const dateRange = getYearRange(selectedYear);
        const visibleSeries = activityBySubreddit.map(series => ({
            sub: series.sub,
            values: series.values.filter(d => d.date >= dateRange[0] && d.date <= dateRange[1])
        }));
        const maxValue = d3.max(visibleSeries, d => d3.max(d.values, v => v[metric])) ?? 0;

        const x = d3.scaleTime()
            .domain(dateRange)
            .range([0, panelWidth]);

        const y = d3.scaleLinear()
            .domain([0, maxValue])
            .nice()
            .range([panelHeight, 0]);

        const line = d3.line()
            .defined(d => Number.isFinite(d[metric]))
            .x(d => x(d.date))
            .y(d => y(d[metric]));

        chart.append("text")
            .attr("x", panelWidth / 2)
            .attr("y", -18)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "700")
            .style("fill", "#333")
            .text(selectedYear == null ? title : `${title} (${selectedYear})`);

        chart.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", panelWidth)
            .attr("height", panelHeight)
            .attr("fill", "transparent")
            .on("click", () => {
                setYear(null);
                hideTooltip();
                createRedVis();
            });

        const xAxis = d3.axisBottom(x)
            .ticks(selectedYear == null ? d3.timeYear.every(1) : d3.timeMonth.every(3))
            .tickFormat(selectedYear == null ? d3.timeFormat("%Y") : d => `Q${Math.floor(d.getMonth() / 3) + 1}`);

        const xAxisGroup = chart.append("g")
            .attr("transform", `translate(0,${panelHeight})`)
            .call(xAxis);

        if (selectedYear == null) {
            xAxisGroup.selectAll(".tick")
                .style("cursor", "pointer")
                .on("click", (event, date) => {
                    event.stopPropagation();
                    setYear(date.getFullYear());
                    hideTooltip();
                    createRedVis();
                });

            xAxisGroup.selectAll("text")
                .style("font-size", "9px")
                .attr("transform", "rotate(-45)")
                .attr("text-anchor", "end");
        } else {
            chart.append("text")
                .attr("x", panelWidth)
                .attr("y", -18)
                .attr("text-anchor", "end")
                .style("font-size", "11px")
                .style("fill", "#555")
                .style("cursor", "pointer")
                .text("Reset")
                .on("click", event => {
                    event.stopPropagation();
                    setYear(null);
                    hideTooltip();
                    createRedVis();
                });
        }

        chart.append("g")
            .call(d3.axisLeft(y).ticks(6));

        chart.append("text")
            .attr("x", -panelHeight / 2)
            .attr("y", -44)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("Posts per quarter");

        const trendlines = chart.selectAll(".sub-trendlines")
            .data(visibleSeries)
            .enter()
            .append("g")
            .attr("class", "sub-trendlines");

        trendlines.append("path")
            .attr("class", "trendline")
            .attr("fill", "none")
            .attr("stroke", d => subredditColor(d.sub))
            .attr("stroke-width", d => subredditStrokeWidth(d.sub))
            .attr("d", d => line(d.values));

        trendlines.selectAll(".trendline-hover-point")
            .data(d => d.values.map(v => ({ ...v, sub: d.sub })))
            .enter()
            .append("circle")
            .attr("class", "trendline-hover-point")
            .attr("cx", d => x(d.date))
            .attr("cy", d => y(d[metric]))
            .attr("r", d => r_main_subs.includes(d.sub) ? (selectedYear == null ? 4 : 6) : (selectedYear == null ? 3 : 5))
            .attr("fill", d => subredditColor(d.sub))
            .attr("opacity", 0)
            .on("mouseenter", function(event, d) {
                chart.selectAll(".sub-trendlines")
                    .attr("opacity", lineGroup => lineGroup.sub === d.sub ? 1 : 0.15);
                d3.select(this).attr("opacity", 1);
            })
            .on("mousemove", (event, d) => {
                showTooltip(event, `
                    <strong>Subreddit: r/${d.sub}</strong><br>
                    Quarter: ${quarterLabel(d.date)}<br>
                    Posts: ${formatComma(d[metric])}
                `);
            })
            .on("mouseleave", function() {
                chart.selectAll(".sub-trendlines")
                    .attr("opacity", 1);
                d3.select(this).attr("opacity", 0);
                hideTooltip();
            });

        const lineLabelGap = selectedYear == null ? 13 : 16;
        const lineLabels = visibleSeries.map(series => {
            const value = [...series.values].reverse().find(d => Number.isFinite(d[metric]));
            return value
                ? {
                    sub: series.sub,
                    value,
                    desiredY: y(value[metric]) + 3
                }
                : null;
        }).filter(Boolean)
            .sort((a, b) => a.desiredY - b.desiredY);

        lineLabels.forEach((label, index) => {
            label.labelY = index === 0
                ? Math.max(10, label.desiredY)
                : Math.max(label.desiredY, lineLabels[index - 1].labelY + lineLabelGap);
        });

        for (let index = lineLabels.length - 1; index >= 0; index -= 1) {
            const maxY = index === lineLabels.length - 1
                ? panelHeight - 6
                : lineLabels[index + 1].labelY - lineLabelGap;
            lineLabels[index].labelY = Math.min(lineLabels[index].labelY, maxY);
        }

        chart.selectAll(".line-end-label")
            .data(lineLabels)
            .enter()
            .append("text")
            .attr("class", "line-end-label")
            .attr("x", d => x(d.value.date) + 8)
            .attr("y", d => d.labelY)
            .attr("fill", d => subredditColor(d.sub))
            .style("font-size", d => r_main_subs.includes(d.sub) ? "13px" : "10px")
            .style("font-weight", d => r_main_subs.includes(d.sub) ? "700" : "500")
            .text(d => `r/${d.sub}`);

        if (selectedYear == null) {
            chart.append("text")
                .attr("x", panelWidth / 2)
                .attr("y", panelHeight + 48)
                .attr("text-anchor", "middle")
                .style("font-size", "10px")
                .style("fill", "#666")
                .text("Click a year to zoom");
        }
    };

    const drawContributionChart = series => {
        const container = d3.select("#reddit-contribution-vis");
        container.selectAll("*").remove();

        if (!series.length) {
            container.append("p")
                .style("color", "#666")
                .text("Select at least one subreddit to show quarterly contribution.");
            return;
        }

        const allQuarterDates = Array.from(new Set(
            series.flatMap(subredditSeries => subredditSeries.values.map(d => +d.date))
        )).sort((a, b) => a - b).map(d => new Date(d));

        const orderedSeries = [
            ...series.filter(d => !r_main_subs.includes(d.sub)),
            ...series.filter(d => r_main_subs.includes(d.sub))
        ];

        const contributionRows = allQuarterDates.map(date => {
            const parts = orderedSeries.map(subredditSeries => {
                const quarterValue = subredditSeries.values.find(d => +d.date === +date);
                return {
                    sub: subredditSeries.sub,
                    posts: quarterValue?.posts ?? 0
                };
            });
            const total = d3.sum(parts, d => d.posts);
            let runningPercent = 0;

            return {
                date,
                total,
                parts: parts.map(part => {
                    const percent = total ? part.posts / total : 0;
                    const stackedPart = {
                        ...part,
                        percent,
                        y0: runningPercent,
                        y1: runningPercent + percent
                    };
                    runningPercent += percent;
                    return stackedPart;
                })
            };
        });

        const contributionMargin = { top: 40, right: 42, bottom: 60, left: 64 };
        const contributionWidth = redditSvgWidth - contributionMargin.left - contributionMargin.right;
        const contributionHeight = redditSvgHeight - contributionMargin.top - contributionMargin.bottom;
        const contributionSvgWidth = redditSvgWidth;
        const contributionSvgHeight = redditSvgHeight;

        const svg = container.append("svg")
            .attr("width", contributionSvgWidth)
            .attr("height", contributionSvgHeight)
            .attr("viewBox", `0 0 ${contributionSvgWidth} ${contributionSvgHeight}`);

        const chart = svg.append("g")
            .attr("transform", `translate(${contributionMargin.left},${contributionMargin.top})`);

        const x = d3.scaleTime()
            .domain(fullDateRange)
            .range([0, contributionWidth]);

        const y = d3.scaleLinear()
            .domain([0, 1])
            .range([contributionHeight, 0]);

        const quarterStep = contributionRows.length > 1
            ? x(contributionRows[1].date) - x(contributionRows[0].date)
            : contributionWidth;
        const barWidth = Math.max(3, quarterStep * 0.72);

        chart.append("g")
            .attr("class", "contribution-grid")
            .call(d3.axisLeft(y)
                .ticks(5)
                .tickSize(-contributionWidth)
                .tickFormat(""))
            .selectAll("line")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.2);

        chart.select(".contribution-grid .domain").remove();

        chart.append("g")
            .attr("transform", `translate(0,${contributionHeight})`)
            .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")))
            .selectAll("text")
            .style("font-size", "9px")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end");

        chart.append("g")
            .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll("line").remove());

        const quarters = chart.selectAll(".quarter-contribution-bar")
            .data(contributionRows)
            .enter()
            .append("g")
            .attr("class", "quarter-contribution-bar")
            .attr("transform", d => `translate(${x(d.date) - barWidth / 2},0)`);

        quarters.selectAll("rect")
            .data(d => d.parts.map(part => ({ ...part, date: d.date, total: d.total })))
            .enter()
            .append("rect")
            .attr("x", 0)
            .attr("y", d => y(d.y1))
            .attr("width", barWidth)
            .attr("height", d => Math.max(0, y(d.y0) - y(d.y1)))
            .attr("rx", d => 2)
            .attr("ry", d => 2)
            .attr("fill", d => subredditColor(d.sub))
            .attr("opacity", d => d.posts > 0 ? (r_main_subs.includes(d.sub) ? 0.98 : 0.82) : 0)
            .on("mousemove", (event, d) => {
                showTooltip(event, `
                    <strong>Subreddit: r/${d.sub}</strong><br>
                    Quarter: ${quarterLabel(d.date)}<br>
                    Posts: ${formatComma(d.posts)}<br>
                    Share: ${d3.format(".1%")(d.percent)}<br>
                    Selected total: ${formatComma(d.total)}
                `);
            })
            .on("mouseleave", hideTooltip);

        chart.selectAll(".quarter-total-label")
            .data(contributionRows.filter(d => d.date.getMonth() === 0))
            .enter()
            .append("text")
            .attr("class", "quarter-total-label")
            .attr("x", d => x(d.date))
            .attr("y", -12)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("font-weight", "700")
            .style("fill", "#111")
            .text(d => d3.format(".2s")(d.total));

        chart.append("text")
            .attr("x", -contributionHeight / 2)
            .attr("y", -46)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("fill", "#555")
            .text("Share of posts");
    };

    const panelGroup = redditsvg.append("g");

    drawControlComparisonChart();

    drawActivityChart({
        group: panelGroup,
        title: "Posts",
        metric: "posts",
        selectedYear: r_postChartYear,
        setYear: year => { r_postChartYear = year; },
        xOffset: 0
    });

    drawContributionChart(activityBySubreddit);

    console.log('createRedVis called');
}

window.addEventListener('load', init);

// Create map SVG
const mapsvg = d3.select('#map-vis')
    .append('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
    .append('g')
    .attr('transform', null);

// Create reddit SVG
const redditsvg = d3.select('#reddit-vis')
    .append('svg')
    .attr('width', redditSvgWidth)
    .attr('height', redditSvgHeight)
    .attr('viewBox', `0 0 ${redditSvgWidth} ${redditSvgHeight}`)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

function createDepressionGenderVis() {
    const sW = 1200;
    const sH = 520;
    const storyMargin = { top: 48, right: 48, bottom: 92, left: 48 };
    const innerW = sW - storyMargin.left - storyMargin.right;
    const innerH = sH - storyMargin.top - storyMargin.bottom;

    const womenColor = "#4e79a7";
    const menColor = "#59a14f";
    const colW = innerW / 2;
    const leftCx = colW * 0.5;
    const rightCx = colW * 1.5;
    const barW = 80;
    const barRegionTop = 142;
    const baseline = innerH - 54;
    const barMaxPx = baseline - barRegionTop - 26;
    const nLabelYOffset = 44;

    const svg = d3.select("#story-vis")
        .append("svg")
        .attr("width", sW)
        .attr("height", sH)
        .attr("viewBox", `0 0 ${sW} ${sH}`)
        .attr("role", "img")
        .attr("aria-label", "Depression risk by gender comparison");

    const root = svg.append("g")
        .attr("transform", `translate(${storyMargin.left},${storyMargin.top})`);

    root.append("text")
        .attr("x", innerW / 2)
        .attr("y", -14)
        .attr("text-anchor", "middle")
        .style("font-size", "26px")
        .style("font-weight", "600")
        .style("fill", "#2a2a7b")
        .text("Gender Comparison: Depression Burden by Demographic Group");

    root.append("text")
        .attr("x", innerW / 2)
        .attr("y", 14)
        .attr("text-anchor", "middle")
        .style("font-size", "17px")
        .style("fill", "#444")
        .text("Average PHQ-style item score (depression risk number) in the NHANES extract — calculate to reveal population averages");

    function drawFigure(parent, cx, label, fill) {
        const fg = parent.append("g").attr("transform", `translate(${cx},${barRegionTop - 118})`);
        fg.append("circle")
            .attr("r", 34)
            .attr("cy", 40)
            .attr("fill", fill)
            .attr("opacity", 0.9);
        fg.append("circle").attr("cx", -11).attr("cy", 34).attr("r", 3.5).attr("fill", "#fff");
        fg.append("circle").attr("cx", 11).attr("cy", 34).attr("r", 3.5).attr("fill", "#fff");
        fg.append("path")
            .attr("d", "M -14 52 Q 0 60 14 52")
            .attr("fill", "none")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .attr("stroke-linecap", "round");
        fg.append("text")
            .attr("y", 104)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "600")
            .style("fill", "#222")
            .text(label);
        return fg;
    }

    drawFigure(root, leftCx, "Female Respondents", womenColor);
    drawFigure(root, rightCx, "Male Respondents", menColor);

    const promptG = root.append("g").attr("class", "story-risk-prompt");
    promptG.append("text")
        .attr("x", innerW / 2)
        .attr("y", barRegionTop + 30)
        .attr("text-anchor", "middle")
        .style("font-size", "38px")
        .style("fill", "#666")
        .text("?");

    promptG.append("text")
        .attr("x", innerW / 2)
        .attr("y", barRegionTop + 64)
        .attr("text-anchor", "middle")
        .style("font-size", "17px")
        .style("fill", "#555")
        .text("Which demographic group demonstrates higher average depression risk?");

    const barsG = root.append("g")
        .attr("class", "story-risk-bars")
        .style("opacity", 0);

    const noteG = root.append("g")
        .attr("class", "story-risk-note")
        .style("opacity", 0);

    const fmt = d3.format(".2f");

    const compareBtn = d3.select("#story-vis")
        .append("button")
        .attr("type", "button")
        .attr("class", "story-compare-btn")
        .text("Calculate depression risk");

    compareBtn.on("click", function () {
        const btn = d3.select(this);
        if (btn.attr("data-done") === "1") {
            return;
        }

        loadNhanesForStory().then(rows => {
            const genderRows = rows.filter(r => r.gender === 1 || r.gender === 2);
            const byG = d3.rollup(genderRows, v => ({
                mean: d3.mean(v, r => r.depressionRisk),
                n: v.length
            }), r => r.gender);

            const women = byG.get(2) ?? { mean: 0, n: 0 };
            const men = byG.get(1) ?? { mean: 0, n: 0 };
            const yMax = Math.max(3, women.mean, men.mean) * 1.08;

            const yScale = d3.scaleLinear()
                .domain([0, yMax])
                .range([baseline, baseline - barMaxPx]);

            const data = [
                { key: "women", label: "Women", cx: leftCx, mean: women.mean, n: women.n, color: womenColor },
                { key: "men", label: "Men", cx: rightCx, mean: men.mean, n: men.n, color: menColor }
            ];

            barsG.selectAll("*").remove();

            barsG.selectAll("rect.risk-bar")
                .data(data)
                .join("rect")
                .attr("class", "risk-bar")
                .attr("x", d => d.cx - barW / 2)
                .attr("width", barW)
                .attr("y", baseline)
                .attr("height", 0)
                .attr("rx", 6)
                .attr("fill", d => d.color)
                .attr("opacity", 0.88)
                .transition()
                .duration(900)
                .ease(d3.easeCubicOut)
                .attr("y", d => yScale(d.mean))
                .attr("height", d => baseline - yScale(d.mean));

            barsG.selectAll("text.risk-value")
                .data(data)
                .join("text")
                .attr("class", "risk-value")
                .attr("x", d => d.cx)
                .attr("y", baseline)
                .attr("text-anchor", "middle")
                .style("font-size", "21px")
                .style("font-weight", "700")
                .style("fill", "#1a1a1a")
                .text(d => fmt(d.mean))
                .transition()
                .delay(400)
                .duration(500)
                .attr("y", d => yScale(d.mean) - 10);

            barsG.selectAll("text.risk-n")
                .data(data)
                .join("text")
                .attr("class", "risk-n")
                .attr("x", d => d.cx)
                .attr("y", baseline + nLabelYOffset)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("fill", "#444")
                .text(d => `n = ${d3.format(",")(d.n)}`);

            barsG.append("line")
                .attr("x1", 0)
                .attr("x2", innerW)
                .attr("y1", baseline)
                .attr("y2", baseline)
                .attr("stroke", "#333")
                .attr("stroke-width", 1);

            noteG.selectAll("*").remove();
            const ratio = women.mean > 0 ? men.mean / women.mean : NaN;
            const ratioTxt = Number.isFinite(ratio)
                ? `Men’s mean is ${fmt(ratio)}× women’s in this sample (overall average ≈ ${fmt((women.mean + men.mean) / 2)}).`
                : "";

            const footLines = [
                "Higher bars mean more frequent / severe symptoms on average across answered PHQ items — same reading as a “risk” tick upward in narrative viz.",
                ratioTxt || "The gap can be subtle; the next story beat widens the lens (like the population zoom in Pain, Pills, and Prison Time)."
            ];
            const foot = noteG.append("text")
                .attr("x", innerW / 2)
                .attr("y", innerH + 8)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("fill", "#333");
            footLines.forEach((line, i) => {
                foot.append("tspan")
                    .attr("x", innerW / 2)
                    .attr("dy", i === 0 ? 0 : 22)
                    .text(line);
            });

            promptG.transition().duration(400).style("opacity", 0)
                .on("end", () => promptG.style("display", "none"));

            barsG.transition().duration(500).style("opacity", 1);
            noteG.transition().delay(300).duration(500).style("opacity", 1);

            btn.attr("data-done", "1").text("Averages shown").attr("disabled", true);

            const bridgeEl = document.getElementById("story-bridge");
            if (bridgeEl) {
                d3.select(bridgeEl).classed("story-hidden", false);
                bridgeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        });
    });
}

function setupDepressionStoryContinue() {
    d3.select("#story-continue-age").on("click", function () {
        const btn = d3.select(this);
        if (btn.attr("data-done") === "1") {
            return;
        }
        createDepressionAgeVis();
        const ageSec = document.getElementById("story-age-section");
        d3.select(ageSec).classed("story-hidden", false);
        d3.select("#story-bridge").classed("story-hidden", true);
        btn.attr("data-done", "1").attr("disabled", true).text("Age chart shown");
        ageSec?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

function createDepressionAgeVis() {
    if (!d3.select("#story-age-vis").select("svg").empty()) {
        return;
    }
    const sW = 1200;
    const sH = 420;
    const visMargin = { top: 36, right: 40, bottom: 96, left: 64 };
    const innerW = sW - visMargin.left - visMargin.right;
    const innerH = sH - visMargin.top - visMargin.bottom;

    const barColor = d3.scaleOrdinal()
        .domain(NHANES_AGE_BANDS.map(b => b.label))
        .range(["#4e79a7", "#76b7b2", "#59a14f", "#edc949"]);

    const svg = d3.select("#story-age-vis")
        .append("svg")
        .attr("width", sW)
        .attr("height", sH)
        .attr("viewBox", `0 0 ${sW} ${sH}`)
        .attr("role", "img")
        .attr("aria-label", "Mean depression risk by age group");

    const root = svg.append("g")
        .attr("transform", `translate(${visMargin.left},${visMargin.top})`);

    root.append("text")
        .attr("x", innerW / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "600")
        .style("fill", "#2a2a7b")
        .text("Age-Stratified Analysis: Depression Symptoms by Age Group");

    root.append("text")
        .attr("x", innerW / 2)
        .attr("y", 16)
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .style("fill", "#444")
        .text("Age at screening (years); same depression risk number as demographic comparison — now analyzed by life stage");

    const chart = root.append("g")
        .attr("transform", "translate(0, 36)");

    const chartInnerH = innerH - 36;

    loadNhanesForStory().then(rows => {
        const banded = rows
            .map(r => ({ ...r, band: nhanesAgeBand(r.ageYears) }))
            .filter(r => r.band != null);

        const byBand = d3.rollup(banded, v => ({
            mean: d3.mean(v, r => r.depressionRisk),
            n: v.length
        }), r => r.band);

        const data = NHANES_AGE_BANDS.map(b => {
            const s = byBand.get(b.label);
            return {
                label: b.label,
                mean: s?.mean ?? 0,
                n: s?.n ?? 0
            };
        }).filter(d => d.n > 0);

        if (!data.length) {
            chart.append("text")
                .attr("x", innerW / 2)
                .attr("y", chartInnerH / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("fill", "#666")
                .text("No rows with age and depression score.");
            return;
        }

        const fmt = d3.format(".2f");
        const yMax = Math.max(3, d3.max(data, d => d.mean) ?? 0) * 1.08;

        const x = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([0, innerW])
            .padding(0.3);

        const y = d3.scaleLinear()
            .domain([0, yMax])
            .nice()
            .range([chartInnerH, 0]);

        chart.append("line")
            .attr("x1", 0)
            .attr("x2", innerW)
            .attr("y1", chartInnerH)
            .attr("y2", chartInnerH)
            .attr("stroke", "#333")
            .attr("stroke-width", 1);

        chart.selectAll("rect.age-bar")
            .data(data)
            .join("rect")
            .attr("class", "age-bar")
            .attr("x", d => x(d.label) ?? 0)
            .attr("width", x.bandwidth())
            .attr("y", chartInnerH)
            .attr("height", 0)
            .attr("rx", 6)
            .attr("fill", d => barColor(d.label))
            .attr("opacity", 0.9);

        chart.selectAll("rect.age-bar")
            .transition()
            .duration(850)
            .ease(d3.easeCubicOut)
            .attr("y", d => y(d.mean))
            .attr("height", d => chartInnerH - y(d.mean));

        chart.selectAll("text.age-mean")
            .data(data)
            .join("text")
            .attr("class", "age-mean")
            .attr("x", d => (x(d.label) ?? 0) + x.bandwidth() / 2)
            .attr("y", chartInnerH)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "700")
            .style("fill", "#1a1a1a")
            .text(d => fmt(d.mean))
            .transition()
            .delay(350)
            .duration(500)
            .attr("y", d => y(d.mean) - 8);

        chart.selectAll("text.age-n")
            .data(data)
            .join("text")
            .attr("class", "age-n")
            .attr("x", d => (x(d.label) ?? 0) + x.bandwidth() / 2)
            .attr("y", chartInnerH + 34)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#444")
            .text(d => `n = ${d3.format(",")(d.n)}`);

        const xAxis = d3.axisBottom(x).tickSizeOuter(0);
        chart.append("g")
            .attr("transform", `translate(0,${chartInnerH})`)
            .call(xAxis)
            .selectAll("text")
            .style("font-size", "15px")
            .style("fill", "#222");

        chart.append("g")
            .call(d3.axisLeft(y).ticks(6))
            .selectAll("text")
            .style("font-size", "13px");

        chart.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -chartInnerH / 2)
            .attr("y", -44)
            .attr("text-anchor", "middle")
            .style("font-size", "15px")
            .style("fill", "#333")
            .text("Mean depression risk #");
    });
}
