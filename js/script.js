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
    { label: "30–39", lo: 30, hi: 40 },
    { label: "40–49", lo: 40, hi: 50 },
    { label: "50–59", lo: 50, hi: 60 },
    { label: "60–69", lo: 60, hi: 70 },
    { label: "70+",   lo: 70, hi: Infinity },
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
        const risk = d.depression_risk === "" || d.depression_risk == null
            ? NaN
            : +d.depression_risk;
        const ageYears = d.Age_in_years_at_screening === "" || d.Age_in_years_at_screening == null
            ? NaN
            : +d.Age_in_years_at_screening;
        const phq9 = d.phq9_total === "" || d.phq9_total == null ? NaN : +d.phq9_total;
        const weight = d.Full_sample_2_year_MEC_exam_weight === "" || d.Full_sample_2_year_MEC_exam_weight == null
            ? NaN
            : +d.Full_sample_2_year_MEC_exam_weight;
        const bmi = d.Body_Mass_Index_kg_m_2 === "" || d.Body_Mass_Index_kg_m_2 == null ? NaN : +d.Body_Mass_Index_kg_m_2;
        const sleep = d.Sleep_hours_weekdays_or_workdays === "" || d.Sleep_hours_weekdays_or_workdays == null ? NaN : +d.Sleep_hours_weekdays_or_workdays;
        return { gender: g, ageYears, depressionRisk: risk, phq9_total: phq9, Full_sample_2_year_MEC_exam_weight: weight, bmi, sleep };
    }).then(rows => rows.filter(r =>
        Number.isFinite(r.ageYears) && r.ageYears >= 18
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
        "#a8a8a8",
        "#7b7b7b",
        "#c8a36a",
        "#9cb6c8",
        "#cc6f4a"
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
    const descEmphasis = document.querySelector("#section2-desc-emphasis");
    if (!scrolly || !stage || !compareScene || !postScene || !shareScene || !progressFill || !backButton || !nextButton || !descTitle || !descBody || !descEmphasis) {
        return;
    }

    const scenes = [compareScene, postScene, shareScene];
    const sceneCopy = [
        {
            title: "Mental Health Related Communities Have Grown Steadily Since 2011",
            body: "While general-interest subreddits started off more popular than mental health subreddits from 2011-2015, mental health subreddits have steadily increased in activity, indicating a growing number of people seeking help and support.",
            bold: "Click Next to examine the breakdown of mental health-related subreddits."
        },
        {
            title: "Depression-Related Communities Have Dominated Mental Health Subreddits.",
            body: "r/suicidewatch, r/depression, and r/lonely have consistently been the most active mental health subreddits, indicating a high demand for support and discussion in these areas.",
            bold: "Click Next to examine the proportional activity of these subreddits."
        },
        {
            title: "Other Mental Health-Related Communities Have Also Grown.",
            body: "While the raw number of posts in depression-related subreddits has dominated Reddit since its inception, other mental health subreddits have been catching up, occupying more than 50% of the mental health-related posts since 2022.",
            bold: "However, depression is clearly still a dominant topic in the mental health landscape."
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
        descEmphasis.textContent = copy.bold ?? "";
        backButton.disabled = activeIndex === 0;
        nextButton.disabled = activeIndex === scenes.length - 1;
        progressFill.style.width = `${((activeIndex + 1) / scenes.length) * 100}%`;
    };

    backButton.addEventListener("click", () => setActiveScene(activeIndex - 1));
    nextButton.addEventListener("click", () => setActiveScene(activeIndex + 1));
    setActiveScene(0);
    section2RevealObserverInitialized = true;
}

function setupVizRevealFlow() {
    const beginBtn = document.getElementById("begin-story");
    const redditWrap = document.getElementById("viz-block-reddit");
    const mapWrap = document.getElementById("viz-block-map");
    const storyWrap = document.getElementById("viz-block-story");
    const revealMapBtn = document.getElementById("reveal-map-viz");
    const revealStoryBtn = document.getElementById("reveal-story-viz");
    if (!beginBtn || !redditWrap || !mapWrap || !storyWrap || !revealMapBtn || !revealStoryBtn) {
        return;
    }

    beginBtn.addEventListener("click", () => {
        redditWrap.classList.remove("story-hidden");
        redditWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    revealMapBtn.addEventListener("click", () => {
        mapWrap.classList.remove("story-hidden");
        mapWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    revealStoryBtn.addEventListener("click", () => {
        storyWrap.classList.remove("story-hidden");
        storyWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

//load data after page is loaded
function init(){
    setupVizRevealFlow();

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
        .duration(500)
        .ease(d3.easeCubicOut)
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
                strokeWidth: 2,
                opacity: 0.55,
                isMentalHealth: false
            })),
            {
                label: "Selected mental-health subreddits",
                color: "#3f7fca",
                values: toQuarterlyPostValues(combinedMentalDaily),
                strokeWidth: 4.5,
                opacity: 1,
                isMentalHealth: true
            }
        ];

        const allValues = comparisonSeries.flatMap(series => series.values);
        if (!allValues.length) {
            container.append("p")
                .style("color", "#666")
                .text("No control comparison data available.");
            return;
        }

        const comparisonMargin = { top: 40, right: 180, bottom: 60, left: 120 };
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

        const area = d3.area()
            .defined(d => Number.isFinite(d.posts))
            .x(d => x(d.date))
            .y0(comparisonHeight)
            .y1(d => y(d.posts));

        chart.append("g")
            .attr("class", "reddit-grid")
            .call(d3.axisLeft(y)
                .ticks(6)
                .tickSize(-comparisonWidth)
                .tickFormat(""))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line")
                .attr("stroke", "#eeeeee")
                .attr("stroke-width", 1));

        const mentalHealthSeries = comparisonSeries.find(series => series.isMentalHealth);
        if (mentalHealthSeries) {
            chart.append("path")
                .datum(mentalHealthSeries.values)
                .attr("class", "mental-health-area")
                .attr("fill", "#3f7fca")
                .attr("fill-opacity", 0.18)
                .attr("d", area);
        }

       const yAxisGroup = chart.append("g")
        .call(d3.axisLeft(y).ticks(6));

        yAxisGroup.selectAll("text")
            .style("font-size", "13px")
            .style("fill", "#666");

        yAxisGroup.selectAll(".domain, .tick line")
            .attr("stroke", "#d9d9d9");

        chart.append("text")
            .attr("x", (-panelHeight / 2) + 10)

        chart.append("text")
            .attr("x", (-comparisonHeight / 2))
            .attr("y", -85)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#666")
            .style("font-weight", "600")
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
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("opacity", d => d.opacity)
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
            .style("font-size", d => d.isMentalHealth ? "15px" : "13px")
            .style("font-weight", d => d.isMentalHealth ? "700" : "500")
            .each(function(d) {
                const text = d3.select(this);
                if (!d.isMentalHealth) {
                    text.text(d.label);
                    return;
                }

                ["Selected mental-health", "subreddits"].forEach((line, index) => {
                    text.append("tspan")
                        .attr("x", x(d.value.date) + 8)
                        .attr("dy", index === 0 ? 0 : "1.15em")
                        .text(line);
                });
            });

        const xAxisG = chart.append("g")
            .attr("class", "reddit-x-axis")
            .attr("transform", `translate(0,${comparisonHeight})`)
            .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0));
        xAxisG.selectAll(".domain, .tick line").attr("stroke", "#d9d9d9");
        xAxisG.selectAll("text")
            .style("font-size", "13px")
            .attr("fill", "#666")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end");
        chart.append("text")
            .attr("class", "reddit-x-axis-label")
            .attr("x", comparisonWidth / 2)
            .attr("y", comparisonHeight + 70)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#333")
            .style("font-weight", "600")
            .text("Year");
        chart.append("text")
            .attr("x", comparisonWidth / 2)
            .attr("y", -18)
            .attr("text-anchor", "middle")
            .style("font-size", "25px")
            .style("font-weight", "700")
            .style("fill", "#333")
            .text("")
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

        const chartMargin = { top: 10, right: 10, bottom: 60, left: 70 };

        const chartWidth = panelWidth - chartMargin.left - chartMargin.right;
        const chartHeight = panelHeight - chartMargin.top - chartMargin.bottom;

        const chart = group.append("g")
            .attr("transform", `translate(${xOffset + chartMargin.left},${chartMargin.top})`);


        const dateRange = getYearRange(selectedYear);
        const visibleSeries = activityBySubreddit.map(series => ({
            sub: series.sub,
            values: series.values.filter(d => d.date >= dateRange[0] && d.date <= dateRange[1])
        }));
        const maxValue = d3.max(visibleSeries, d => d3.max(d.values, v => v[metric])) ?? 0;

        const x = d3.scaleTime()
            .domain(dateRange)
            .range([0, chartWidth]);

        const y = d3.scaleLinear()
            .domain([0, maxValue])
            .nice()
            .range([chartHeight, 0]);

        const line = d3.line()
            .defined(d => Number.isFinite(d[metric]))
            .x(d => x(d.date))
            .y(d => y(d[metric]));

        chart.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", -18)
            .attr("text-anchor", "middle")
            .style("font-size", "25px")
            .style("font-weight", "700")
            .style("fill", "#333")
            .text(selectedYear == null ? "": `${title} (${selectedYear})`);

        chart.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("fill", "transparent")
            .on("click", () => {
                setYear(null);
                hideTooltip();
                createRedVis();
            });

        chart.append("g")
            .attr("class", "reddit-grid")
            .call(d3.axisLeft(y)
                .ticks(6)
                .tickSize(-chartWidth)
                .tickFormat(""))
            .call(g => g.select(".domain").remove())
            .call(g => g.selectAll(".tick line")
                .attr("stroke", "#eeeeee")
                .attr("stroke-width", 1));

        const yAxisGroup = chart.append("g")
            .call(d3.axisLeft(y).ticks(6));

        yAxisGroup.selectAll("text")
            .style("font-size", "13px")
            .style("fill", "#666");

        yAxisGroup.selectAll(".domain, .tick line")
            .attr("stroke", "#d9d9d9");

        chart.append("text")
            .attr("x", (-chartHeight / 2))
            .attr("y", -90)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "600")
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
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("opacity", d => r_main_subs.includes(d.sub) ? 0.96 : 0.72)
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
            .style("font-size", d => r_main_subs.includes(d.sub) ? "16px" : "12px")
            .style("font-weight", d => r_main_subs.includes(d.sub) ? "700" : "500")
            .text(d => `r/${d.sub}`);

        const xAxis = d3.axisBottom(x)
            .ticks(selectedYear == null ? d3.timeYear.every(1) : d3.timeMonth.every(3))
            .tickFormat(selectedYear == null ? d3.timeFormat("%Y") : d => `Q${Math.floor(d.getMonth() / 3) + 1}`)
            .tickSizeOuter(6);

        const xAxisGroup = chart.append("g")
            .attr("class", "reddit-x-axis")
            .attr("transform", `translate(0,${chartHeight})`)
            .call(xAxis);
        xAxisGroup.selectAll(".domain, .tick line").attr("stroke", "#d9d9d9");
        xAxisGroup.selectAll("text").attr("fill", "#666");

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
                .style("font-size", "16px")
                .attr("transform", "rotate(-45)")
                .attr("text-anchor", "end");
        } else {
            chart.append("text")
                .attr("x", chartWidth)
                .attr("y", -18)
                .attr("text-anchor", "end")
                .style("font-size", "16px")
                .style("font-weight", "600")
                .style("fill", "#555")
                .style("cursor", "pointer")
                .text("Reset")
                .on("click", event => {
                    event.stopPropagation();
                    setYear(null);
                    hideTooltip();
                    createRedVis();
                });
            xAxisGroup.selectAll("text").style("font-size", "13px");
        }

        chart.append("text")
            .attr("class", "reddit-x-axis-label")
            .attr("x", chartWidth / 2)
            .attr("y", chartHeight + 70)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "600")
            .style("fill", "#333")
            .text(selectedYear == null ? "Year" : "Quarter");

        if (selectedYear == null) {
            chart.append("text")
                .attr("x", chartWidth / 2)
                .attr("y", chartHeight + 110)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("font-style", "italic")
                .style("font-weight", "600")
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
            .attr("stroke", "#eeeeee")
            .attr("stroke-width", 1);

        chart.select(".contribution-grid .domain").remove();

        const yAxisGroup = chart.append("g")
            .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")));

        yAxisGroup.selectAll("text")
            .style("font-size", "13px")
            .style("fill", "#666");

        yAxisGroup.selectAll(".domain, .tick line")
            .attr("stroke", "#d9d9d9");

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

        const contribXAxis = chart.append("g")
            .attr("class", "reddit-x-axis")
            .attr("transform", `translate(0,${contributionHeight})`)
            .call(d3.axisBottom(x).ticks(d3.timeYear.every(1)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(6));
        contribXAxis.selectAll(".domain, .tick line").attr("stroke", "#d9d9d9");
        contribXAxis.selectAll("text")
            .style("font-size", "13px")
            .attr("fill", "#666")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end");
        chart.append("text")
            .attr("class", "reddit-x-axis-label")
            .attr("x", contributionWidth / 2)
            .attr("y", contributionHeight + 60)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "600")
            .style("fill", "#333")
            .text("Year");

        chart.selectAll(".quarter-total-label")
            .data(contributionRows.filter(d => d.date.getMonth() === 0))
            .enter()
            .append("text")
            .attr("class", "quarter-total-label")
            .attr("x", d => x(d.date))
            .attr("y", -12)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "700")
            .style("fill", "#111")
            .text(d => d3.format(".2s")(d.total));

        chart.append("text")
            .attr("x", -contributionHeight / 2)
            .attr("y", -46)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "600")
            .style("fill", "#555")
            .text("Share of posts");

        chart.append("text")
            .attr("x", contributionWidth / 2)
            .attr("y", -40)
            .attr("text-anchor", "middle")
            .style("font-size", "25px")
            .style("font-weight", "700")
            .style("fill", "#333")
            .text("Proportions of Mental Health Subreddit Posts, 2011-2025")
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
    const svgW = 900, svgH = 500;
    const m = { top: 60, right: 40, bottom: 90, left: 70 };
    const innerW = svgW - m.left - m.right;
    const innerH = svgH - m.top - m.bottom;

    const womenColor = "#7b5ea7";
    const menColor   = "#3a7abf";

    const barW      = 110;
    const barMaxPx  = innerH;
    const leftCx    = innerW * 0.32;
    const rightCx   = innerW * 0.68;
    const baseline  = innerH;
    const nLabelYOffset = 28;

    const fmt = d3.format(".2f");

    const svg = d3.select("#story-vis")
        .append("svg")
        .attr("width", svgW)
        .attr("height", svgH)
        .attr("viewBox", `0 0 ${svgW} ${svgH}`);

    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    // Fixed PHQ-9 y-axis: 0–27
    const yScale = d3.scaleLinear().domain([0, 27]).range([baseline, 0]);

    // Y-axis
    const yAxis = g.append("g")
        .call(d3.axisLeft(yScale).ticks(9).tickSize(-innerW))
        .attr("class", "gender-y-axis");
    yAxis.selectAll(".tick line")
        .attr("stroke", "#ccc")
        .attr("stroke-dasharray", "3,3");
    yAxis.select(".domain").remove();
    yAxis.selectAll("text")
        .style("font-size", "14px")
        .style("fill", "#555");

    // Y-axis label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2)
        .attr("y", -52)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#555")
        .text("Weighted Mean PHQ-9 Score (0–27)");

    // Baseline
    g.append("line")
        .attr("x1", 0).attr("x2", innerW)
        .attr("y1", baseline).attr("y2", baseline)
        .attr("stroke", "#333").attr("stroke-width", 1.5);

    // Gender labels (static)
    const labelData = [
        { label: "Women", cx: leftCx,  color: womenColor },
        { label: "Men",   cx: rightCx, color: menColor   }
    ];
    g.selectAll("text.gender-label")
        .data(labelData)
        .join("text")
        .attr("class", "gender-label")
        .attr("x", d => d.cx)
        .attr("y", baseline + 58)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "700")
        .style("fill", d => d.color)
        .text(d => d.label);

    // Chart title
    g.append("text")
        .attr("x", innerW / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "700")
        .style("fill", "#1a1a1a")
        .text("Nationally Representative Average PHQ-9 Score by Gender");

    const barsG = g.append("g").attr("class", "bars-group");

    loadNhanesForStory().then(rows => {
        // Filter: valid gender, valid phq9, valid weight
        const genderRows = rows.filter(r =>
            (r.gender === 1 || r.gender === 2) &&
            Number.isFinite(r.phq9_total) &&
            Number.isFinite(r.Full_sample_2_year_MEC_exam_weight) &&
            r.Full_sample_2_year_MEC_exam_weight > 0
        );

        const byG = d3.rollup(genderRows, v => {
            const totalWeightedScore = d3.sum(v, r => r.phq9_total * r.Full_sample_2_year_MEC_exam_weight);
            const totalWeights       = d3.sum(v, r => r.Full_sample_2_year_MEC_exam_weight);
            return {
                mean:        totalWeights > 0 ? totalWeightedScore / totalWeights : 0,
                n:           v.length,
                popEstimate: totalWeights
            };
        }, r => r.gender);

        const women = byG.get(2) ?? { mean: 0, n: 0, popEstimate: 0 };
        const men   = byG.get(1) ?? { mean: 0, n: 0, popEstimate: 0 };

        const minVal = Math.min(women.mean, men.mean);
        const maxVal = Math.max(women.mean, men.mean);
        const pad    = (maxVal - minVal) * 1.5;
        const yMin   = Math.max(0, minVal - pad);
        const yMax   = maxVal + pad;
        yScale.domain([yMin, yMax]);

        // Redraw y-axis with updated domain
        g.select(".gender-y-axis")
            .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW))
            .selectAll(".tick line").attr("stroke", "#ccc").attr("stroke-dasharray", "3,3");
        g.select(".gender-y-axis .domain").remove();
        g.select(".gender-y-axis").selectAll("text").style("font-size", "14px").style("fill", "#555");

        const data = [
            { key: "women", label: "Women", cx: leftCx,  mean: women.mean, n: women.n, pop: women.popEstimate, color: womenColor },
            { key: "men",   label: "Men",   cx: rightCx, mean: men.mean,   n: men.n,   pop: men.popEstimate,   color: menColor   }
        ];

        barsG.selectAll("*").remove();

        // Bars
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
            .transition().duration(800).ease(d3.easeCubicOut)
            .delay((_, i) => i * 80)
            .attr("y", d => yScale(d.mean))
            .attr("height", d => baseline - yScale(d.mean));

        // Value labels (animated up with bars)
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
            .transition().delay((_, i) => i * 150 + 400).duration(400)
            .attr("y", d => yScale(d.mean) - 10);

        // n / population labels
        barsG.selectAll("text.risk-n")
            .data(data)
            .join("text")
            .attr("class", "risk-n")
            .attr("x", d => d.cx)
            .attr("y", baseline + nLabelYOffset)
            .attr("text-anchor", "middle")
            .style("font-size", "13px")
            .style("fill", "#666")
            .text(d => `n = ${d3.format(",")(d.n)} (~${d3.format(".2s")(d.pop)} people)`);

        // Reveal bridge after animation
        setTimeout(() => {
            const bridge = document.getElementById("story-bridge");
            if (bridge) bridge.classList.remove("story-hidden");
        }, 1500);
    });
}

function setupDepressionStoryContinue() {
    const btn = document.getElementById("story-continue-age");
    const ageSection = document.getElementById("story-age-section");
    if (!btn || !ageSection) return;

    btn.addEventListener("click", () => {
        ageSection.classList.remove("story-hidden");
        createDepressionAgeVis();
        ageSection.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
            const bmiBridge = document.getElementById("story-bmi-bridge");
            if (bmiBridge) bmiBridge.classList.remove("story-hidden");
        }, 1200);
    });

    const bmiBtn = document.getElementById("story-continue-bmi");
    const bmiSection = document.getElementById("story-bmi-section");
    if (bmiBtn && bmiSection) {
        bmiBtn.addEventListener("click", () => {
            bmiSection.classList.remove("story-hidden");
            createDepressionBmiVis();
            bmiSection.scrollIntoView({ behavior: "smooth", block: "start" });
            setTimeout(() => {
                const sleepBridge = document.getElementById("story-sleep-bridge");
                if (sleepBridge) sleepBridge.classList.remove("story-hidden");
            }, 1200);
        });
    }

    const sleepBtn = document.getElementById("story-continue-sleep");
    const sleepSection = document.getElementById("story-sleep-section");
    if (sleepBtn && sleepSection) {
        sleepBtn.addEventListener("click", () => {
            sleepSection.classList.remove("story-hidden");
            createDepressionSleepVis();
            sleepSection.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }
}

function createDepressionAgeVis() {
    const container = document.getElementById("story-age-vis");
    if (!container || container.querySelector("svg")) return; // only render once

    const svgW = 900, svgH = 500;
    const m = { top: 60, right: 40, bottom: 80, left: 70 };
    const innerW = svgW - m.left - m.right;
    const innerH = svgH - m.top - m.bottom;

    const bands = NHANES_AGE_BANDS.map(b => b.label);

    const svg = d3.select("#story-age-vis")
        .append("svg")
        .attr("width", svgW)
        .attr("height", svgH)
        .attr("viewBox", `0 0 ${svgW} ${svgH}`);

    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const xScale = d3.scaleBand()
        .domain(bands)
        .range([0, innerW])
        .padding(0.35);

    // Placeholder y-scale; domain set after data loads
    const yScale = d3.scaleLinear().range([innerH, 0]);

    // X-axis
    const xAxisG = g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).tickSizeOuter(0));
    xAxisG.selectAll(".domain, .tick line").attr("stroke", "#444");
    xAxisG.selectAll("text").style("font-size", "15px").style("fill", "#333");

    g.append("text")
        .attr("x", innerW / 2)
        .attr("y", innerH + 58)
        .attr("text-anchor", "middle")
        .style("font-size", "14px").style("fill", "#555")
        .text("Age Group");

    // Y-axis group (redrawn after data)
    const yAxisG = g.append("g").attr("class", "age-y-axis");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2).attr("y", -52)
        .attr("text-anchor", "middle")
        .style("font-size", "14px").style("fill", "#555")
        .text("Weighted Mean PHQ-9 Score");

    // Chart title
    g.append("text")
        .attr("x", innerW / 2).attr("y", -30)
        .attr("text-anchor", "middle")
        .style("font-size", "20px").style("font-weight", "700").style("fill", "#1a1a1a")
        .text("Depression Burden by Age Group (Nationally Representative)");

    // Baseline
    g.append("line").attr("class", "age-baseline")
        .attr("x1", 0).attr("x2", innerW)
        .attr("y1", innerH).attr("y2", innerH)
        .attr("stroke", "#333").attr("stroke-width", 1.5);

    const barsG = g.append("g");

    // Color scale: darker purple for younger, fading to blue for older
    const colorScale = d3.scaleSequential()
        .domain([0, bands.length - 1])
        .interpolator(d3.interpolateRgb("#7b5ea7", "#3a7abf"));

    loadNhanesForStory().then(rows => {
        const valid = rows.filter(r =>
            Number.isFinite(r.phq9_total) &&
            Number.isFinite(r.Full_sample_2_year_MEC_exam_weight) &&
            r.Full_sample_2_year_MEC_exam_weight > 0 &&
            Number.isFinite(r.ageYears)
        );

        const byBand = d3.rollup(valid, v => {
            const tw = d3.sum(v, r => r.Full_sample_2_year_MEC_exam_weight);
            const ws = d3.sum(v, r => r.phq9_total * r.Full_sample_2_year_MEC_exam_weight);
            return { mean: tw > 0 ? ws / tw : 0, n: v.length, pop: tw };
        }, r => nhanesAgeBand(r.ageYears));

        const data = NHANES_AGE_BANDS.map((b, i) => {
            const d = byBand.get(b.label) ?? { mean: 0, n: 0, pop: 0 };
            return { label: b.label, mean: d.mean, n: d.n, pop: d.pop, color: colorScale(i) };
        });

        // Dynamic y domain with padding
        const minVal = d3.min(data, d => d.mean);
        const maxVal = d3.max(data, d => d.mean);
        const pad = (maxVal - minVal) * 1.2;
        yScale.domain([Math.max(0, minVal - pad), maxVal + pad]);

        // Draw y-axis
        yAxisG.call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW));
        yAxisG.selectAll(".tick line").attr("stroke", "#ccc").attr("stroke-dasharray", "3,3");
        yAxisG.select(".domain").remove();
        yAxisG.selectAll("text").style("font-size", "14px").style("fill", "#555");

        // Bars
        barsG.selectAll("rect.age-bar")
            .data(data)
            .join("rect")
            .attr("class", "age-bar")
            .attr("x", d => xScale(d.label))
            .attr("width", xScale.bandwidth())
            .attr("y", innerH)
            .attr("height", 0)
            .attr("rx", 5)
            .attr("fill", d => d.color)
            .attr("opacity", 0.88)
            .transition().duration(800).ease(d3.easeCubicOut)
            .delay((_, i) => i * 80)
            .attr("y", d => yScale(d.mean))
            .attr("height", d => innerH - yScale(d.mean));

        // Value labels
        barsG.selectAll("text.age-value")
            .data(data)
            .join("text")
            .attr("class", "age-value")
            .attr("x", d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr("y", innerH)
            .attr("text-anchor", "middle")
            .style("font-size", "16px").style("font-weight", "700").style("fill", "#1a1a1a")
            .text(d => d3.format(".2f")(d.mean))
            .transition().delay((_, i) => i * 80 + 400).duration(400)
            .attr("y", d => yScale(d.mean) - 10);

        // n labels
        barsG.selectAll("text.age-n")
            .data(data)
            .join("text")
            .attr("class", "age-n")
            .attr("x", d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr("y", innerH + 35)
            .attr("text-anchor", "middle")
            .style("font-size", "12px").style("fill", "#666")
            .text(d => `n=${d3.format(",")(d.n)}`);
    });
}

const BMI_CATEGORIES = [
    { label: "Underweight", lo: 0,    hi: 18.5 },
    { label: "Healthy",     lo: 18.5, hi: 25.0 },
    { label: "Overweight",  lo: 25.0, hi: 30.0 },
    { label: "Obesity",     lo: 30.0, hi: Infinity },
];

function createDepressionBmiVis() {
    const container = document.getElementById("story-bmi-vis");
    if (!container || container.querySelector("svg")) return;

    const svgW = 900, svgH = 500;
    const m = { top: 60, right: 40, bottom: 90, left: 70 };
    const innerW = svgW - m.left - m.right;
    const innerH = svgH - m.top - m.bottom;

    const labels = BMI_CATEGORIES.map(b => b.label);

    const svg = d3.select("#story-bmi-vis")
        .append("svg")
        .attr("width", svgW)
        .attr("height", svgH)
        .attr("viewBox", `0 0 ${svgW} ${svgH}`);

    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const xScale = d3.scaleBand()
        .domain(labels)
        .range([0, innerW])
        .padding(0.35);

    const yScale = d3.scaleLinear().range([innerH, 0]);

    // X-axis
    const xAxisG = g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).tickSizeOuter(0));
    xAxisG.selectAll(".domain, .tick line").attr("stroke", "#444");
    xAxisG.selectAll("text").style("font-size", "15px").style("fill", "#333");

    g.append("text")
        .attr("x", innerW / 2).attr("y", innerH + 58)
        .attr("text-anchor", "middle")
        .style("font-size", "14px").style("fill", "#555")
        .text("BMI Category");

    const yAxisG = g.append("g").attr("class", "bmi-y-axis");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2).attr("y", -52)
        .attr("text-anchor", "middle")
        .style("font-size", "14px").style("fill", "#555")
        .text("Weighted Mean PHQ-9 Score");

    g.append("text")
        .attr("x", innerW / 2).attr("y", -30)
        .attr("text-anchor", "middle")
        .style("font-size", "20px").style("font-weight", "700").style("fill", "#1a1a1a")
        .text("Depression Burden by BMI Category (Nationally Representative)");

    g.append("line")
        .attr("x1", 0).attr("x2", innerW)
        .attr("y1", innerH).attr("y2", innerH)
        .attr("stroke", "#333").attr("stroke-width", 1.5);

    const barsG = g.append("g");

    loadNhanesForStory().then(rows => {
        const valid = rows.filter(r =>
            Number.isFinite(r.bmi) && r.bmi > 0 &&
            Number.isFinite(r.phq9_total) &&
            Number.isFinite(r.Full_sample_2_year_MEC_exam_weight) &&
            r.Full_sample_2_year_MEC_exam_weight > 0
        );

        const data = BMI_CATEGORIES.map(b => {
            const grp = valid.filter(r => r.bmi >= b.lo && r.bmi < b.hi);
            const tw  = d3.sum(grp, r => r.Full_sample_2_year_MEC_exam_weight);
            const ws  = d3.sum(grp, r => r.phq9_total * r.Full_sample_2_year_MEC_exam_weight);
            return { label: b.label, mean: tw > 0 ? ws / tw : 0, n: grp.length, pop: tw };
        });

        const minVal = d3.min(data, d => d.mean);
        const maxVal = d3.max(data, d => d.mean);
        const pad = (maxVal - minVal) * 1.2;
        yScale.domain([Math.max(0, minVal - pad), maxVal + pad]);

        yAxisG.call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW));
        yAxisG.selectAll(".tick line").attr("stroke", "#ccc").attr("stroke-dasharray", "3,3");
        yAxisG.select(".domain").remove();
        yAxisG.selectAll("text").style("font-size", "14px").style("fill", "#555");

        const bmiColor = d3.scaleSequential()
            .domain([0, BMI_CATEGORIES.length - 1])
            .interpolator(d3.interpolateRgb("#7b5ea7", "#3a7abf"));

        // Bars
        barsG.selectAll("rect.bmi-bar")
            .data(data)
            .join("rect")
            .attr("class", "bmi-bar")
            .attr("x", d => xScale(d.label))
            .attr("width", xScale.bandwidth())
            .attr("y", innerH).attr("height", 0)
            .attr("rx", 5)
            .attr("fill", (d, i) => bmiColor(i))
            .attr("opacity", 0.88)
            .transition().duration(800).ease(d3.easeCubicOut)
            .delay((_, i) => i * 100)
            .attr("y", d => yScale(d.mean))
            .attr("height", d => innerH - yScale(d.mean));

        // Value labels
        barsG.selectAll("text.bmi-value")
            .data(data)
            .join("text")
            .attr("class", "bmi-value")
            .attr("x", d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr("y", innerH)
            .attr("text-anchor", "middle")
            .style("font-size", "16px").style("font-weight", "700").style("fill", "#1a1a1a")
            .text(d => d3.format(".2f")(d.mean))
            .transition().delay((_, i) => i * 100 + 400).duration(400)
            .attr("y", d => yScale(d.mean) - 10);

        // n labels
        barsG.selectAll("text.bmi-n")
            .data(data)
            .join("text")
            .attr("class", "bmi-n")
            .attr("x", d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr("y", innerH + 35)
            .attr("text-anchor", "middle")
            .style("font-size", "12px").style("fill", "#666")
            .text(d => `n=${d3.format(",")(d.n)}`);
    });
}

const SLEEP_CATEGORIES = [
    { label: "Very Short\n(<6h)",      lo: 2,  hi: 6  },
    { label: "Short\n(6h)",            lo: 6,  hi: 7  },
    { label: "Recommended\n(7–9h)",    lo: 7,  hi: 10 },
    { label: "Long\n(>9h)",            lo: 10, hi: 15 },
];

function createDepressionSleepVis() {
    const container = document.getElementById("story-sleep-vis");
    if (!container || container.querySelector("svg")) return;

    const svgW = 900, svgH = 520;
    const m = { top: 60, right: 40, bottom: 100, left: 70 };
    const innerW = svgW - m.left - m.right;
    const innerH = svgH - m.top - m.bottom;

    const labels = SLEEP_CATEGORIES.map(b => b.label);

    const svg = d3.select("#story-sleep-vis")
        .append("svg")
        .attr("width", svgW)
        .attr("height", svgH)
        .attr("viewBox", `0 0 ${svgW} ${svgH}`);

    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const xScale = d3.scaleBand()
        .domain(labels)
        .range([0, innerW])
        .padding(0.35);

    const yScale = d3.scaleLinear().range([innerH, 0]);

    // X-axis — split multi-line labels on \n
    const xAxisG = g.append("g")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(xScale).tickSizeOuter(0));
    xAxisG.selectAll(".domain, .tick line").attr("stroke", "#444");
    xAxisG.selectAll(".tick text").remove(); // replace with wrapped text
    xAxisG.selectAll(".tick").each(function(d) {
        const parts = d.split("\n");
        const tick = d3.select(this);
        parts.forEach((line, i) => {
            tick.append("text")
                .attr("y", 20 + i * 18)
                .attr("text-anchor", "middle")
                .style("font-size", i === 0 ? "15px" : "13px")
                .style("fill", "#333")
                .style("font-weight", i === 0 ? "500" : "400")
                .text(line);
        });
    });

    g.append("text")
        .attr("x", innerW / 2).attr("y", innerH + 78)
        .attr("text-anchor", "middle")
        .style("font-size", "14px").style("fill", "#555")
        .text("Weekday Sleep Duration");

    const yAxisG = g.append("g").attr("class", "sleep-y-axis");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2).attr("y", -52)
        .attr("text-anchor", "middle")
        .style("font-size", "14px").style("fill", "#555")
        .text("Weighted Mean PHQ-9 Score");

    g.append("text")
        .attr("x", innerW / 2).attr("y", -30)
        .attr("text-anchor", "middle")
        .style("font-size", "20px").style("font-weight", "700").style("fill", "#1a1a1a")
        .text("Depression Burden by Sleep Duration (Nationally Representative)");

    g.append("line")
        .attr("x1", 0).attr("x2", innerW)
        .attr("y1", innerH).attr("y2", innerH)
        .attr("stroke", "#333").attr("stroke-width", 1.5);

    const barsG = g.append("g");

    loadNhanesForStory().then(rows => {
        const valid = rows.filter(r =>
            Number.isFinite(r.sleep) && r.sleep >= 2 && r.sleep <= 14 &&
            Number.isFinite(r.phq9_total) &&
            Number.isFinite(r.Full_sample_2_year_MEC_exam_weight) &&
            r.Full_sample_2_year_MEC_exam_weight > 0
        );

        const data = SLEEP_CATEGORIES.map(b => {
            const grp = valid.filter(r => r.sleep >= b.lo && r.sleep < b.hi);
            const tw  = d3.sum(grp, r => r.Full_sample_2_year_MEC_exam_weight);
            const ws  = d3.sum(grp, r => r.phq9_total * r.Full_sample_2_year_MEC_exam_weight);
            return { label: b.label, color: b.color, mean: tw > 0 ? ws / tw : 0, n: grp.length };
        });

        const minVal = d3.min(data, d => d.mean);
        const maxVal = d3.max(data, d => d.mean);
        const pad = (maxVal - minVal) * 1.2;
        yScale.domain([Math.max(0, minVal - pad), maxVal + pad]);

        yAxisG.call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW));
        yAxisG.selectAll(".tick line").attr("stroke", "#ccc").attr("stroke-dasharray", "3,3");
        yAxisG.select(".domain").remove();
        yAxisG.selectAll("text").style("font-size", "14px").style("fill", "#555");

        const sleepColor = d3.scaleSequential()
            .domain([0, SLEEP_CATEGORIES.length - 1])
            .interpolator(d3.interpolateRgb("#7b5ea7", "#3a7abf"));

        // Bars
        barsG.selectAll("rect.sleep-bar")
            .data(data)
            .join("rect")
            .attr("class", "sleep-bar")
            .attr("x", d => xScale(d.label))
            .attr("width", xScale.bandwidth())
            .attr("y", innerH).attr("height", 0)
            .attr("rx", 5)
            .attr("fill", (d, i) => sleepColor(i))
            .attr("opacity", 0.88)
            .transition().duration(800).ease(d3.easeCubicOut)
            .delay((_, i) => i * 100)
            .attr("y", d => yScale(d.mean))
            .attr("height", d => innerH - yScale(d.mean));

        // Value labels
        barsG.selectAll("text.sleep-value")
            .data(data)
            .join("text")
            .attr("class", "sleep-value")
            .attr("x", d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr("y", innerH)
            .attr("text-anchor", "middle")
            .style("font-size", "16px").style("font-weight", "700").style("fill", "#1a1a1a")
            .text(d => d3.format(".2f")(d.mean))
            .transition().delay((_, i) => i * 100 + 400).duration(400)
            .attr("y", d => yScale(d.mean) - 10);

        // n labels
        barsG.selectAll("text.sleep-n")
            .data(data)
            .join("text")
            .attr("class", "sleep-n")
            .attr("x", d => xScale(d.label) + xScale.bandwidth() / 2)
            .attr("y", innerH + 51)
            .attr("text-anchor", "middle")
            .style("font-size", "12px").style("fill", "#666")
            .text(d => `n=${d3.format(",")(d.n)}`);
    });
}
