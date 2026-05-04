console.log('D3 Version:', d3.version);

let mapData = []
let selectedYear = 2020

let r_casesData_total = []
let r_casesData_perday = []
let r_eventData = []
let r_sentimentData = []

const parseDate = d3.timeParse("%Y-%m-%d");
let r_selectedDateRange = [parseDate("2020-01-01"), parseDate("2020-04-20")];
const r_allSubreddits = [
    "COVID19_support",
    "addiction",
    "adhd",
    "anxiety",
    "autism",
    "bipolarreddit",
    "bpd",
    "depression",
    "healthanxiety",
    "lonely",
    "mentalhealth",
    "ptsd",
    "schizophrenia",
    "socialanxiety",
    "suicidewatch"
];
const r_visibleSubreddits = [
    "lonely",
    "schizophrenia",
    "socialanxiety",
    "suicidewatch"
];

const t = 1000; // 1000ms = 1 second

//make margins
const margin = {top: 40, right: 40, bottom: 60, left: 60};
const width = 1200 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;
const svgWidth = width + margin.left + margin.right;
const svgHeight = height + margin.top + margin.bottom;

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
    .domain(r_allSubreddits)
    .range([
        "#cd9b9b",
        "#c1a68a",
        "#b8c18a",
        "#96c18a",
        "#8ac1b1",
        "#8aaec1",
        "#9b9bcd",
        "#b68ac1",
        "#c18aac",
        "#d97979",
        "#d99b59",
        "#a4b84f",
        "#59a66f",
        "#4f92b8",
        "#7a6fc2"
    ]);

const formatDate = d3.timeFormat("%b %d, %Y");
const formatComma = d3.format(",");

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

function createSubredditControls() {
    const controls = d3.select("#subreddit-controls");

    controls.selectAll("*").remove();

    controls.append("div")
        .attr("class", "control-title")
        .text("Visible subreddits");

    const options = controls.append("div")
        .attr("class", "subreddit-options");

    const labels = options.selectAll("label")
        .data(r_allSubreddits)
        .join("label")
        .attr("class", "subreddit-option");

    labels.append("input")
        .attr("type", "checkbox")
        .attr("name", "subreddit")
        .attr("value", d => d)
        .property("checked", d => r_visibleSubreddits.includes(d))
        .on("change", function(event, subreddit) {
            if (this.checked) {
                if (!r_visibleSubreddits.includes(subreddit)) {
                    r_visibleSubreddits.push(subreddit);
                }
            } else {
                const index = r_visibleSubreddits.indexOf(subreddit);
                if (index !== -1) {
                    r_visibleSubreddits.splice(index, 1);
                }
            }

            createRedVis();
        });

    labels.append("span")
        .style("background-color", d => subColor(d))
        .text(d => `r/${d}`)
        .style("font-size", "10px");
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


    const casesPromise_total = d3.csv("./data/us.csv", function(d){
        return {
            date: parseDate(d.date),
            cases: +d.cases,
            deaths: +d.deaths
        }
    })
    .then(data => {
        r_casesData_total = data
        console.log(r_casesData_total)
    })
    .catch(error => console.error('Error loading cases data:', error));


    const casesPromise_perday = d3.csv("./data/us_new_cases_per_day.csv", function(d){
        return {
            date: parseDate(d.date),
            cases: +d.cases,
            deaths: +d.deaths
        }
    })
    .then(data => {
        r_casesData_perday = data
        console.log(r_casesData_perday)
    })
    .catch(error => console.error('Error loading cases data:', error));


    const eventsPromise = d3.csv("./data/covid_major_events.csv", function(d){
        return {
            event: d.event,
            date: parseDate(d.time)
        }
    })
    .then(data => {
        r_eventData = data
        console.log(r_eventData)
    })
    .catch(error => console.error('Error loading event data:', error));

    const sentimentPromise = d3.csv("./data/daily_subreddit_sentiment_counts.csv", function(d){
        return {
            date: parseDate(d.date),
            subreddit: d.subreddit,
            period: d.period,
            totalPosts: +d.total_posts,
            positivePosts: +d.positive_posts,
            negativePosts: +d.negative_posts,
            neutralPosts: +d.neutral_posts,
            unknownPosts: +d.unknown_posts,
            positiveRatio: +d.positive_ratio,
            negativeRatio: +d.negative_ratio,
            neutralRatio: +d.neutral_ratio,
            unknownRatio: +d.unknown_ratio,
            avgCompound: +d.avg_compound
        }
    })
    .then(data => {
        r_sentimentData = data
        console.log(r_sentimentData)
    })
    .catch(error => console.error('Error loading sentiment data:', error));

    Promise.all([casesPromise_total, casesPromise_perday, eventsPromise, sentimentPromise]).then(() => {
        createSubredditControls()
        createRedVis()
    });

    createDepressionGenderVis();
    setupDepressionStoryContinue();
}


//map function adapted from https://observablehq.com/@d3/choropleth/2
async function createMapVis(){
    //set colors, project, and path
    const color = d3.scaleQuantize([10, 35], d3.schemePurples[7].slice(2));
    const projection = d3.geoAlbersUsa();
    const path = d3.geoPath(projection);

    //us is the us map
    const us = await fetch("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json")
        .then(r => r.json());
    const counties = topojson.feature(us, us.objects.counties);
    //adjust size of projection manually
    projection.fitSize([width + margin.left + margin.right - 180, height + margin.top + margin.bottom - 50], counties);
    //adjust padding around projection
    projection.translate([
        projection.translate()[0],
        projection.translate()[1] + 20
    ]);

    //filter for current year
    const filtered = mapData.filter(d => +d.year === +selectedYear);


    //map county codes (ids) to depression rates (value)
    const valuemap = new Map(
  filtered.map(d => [cleanID(d.countyID), d.value])
);

    //get states and statemap
    const states = topojson.feature(us, us.objects.states);
    const statemap = new Map(states.features.map(d => [d.id, d]));
    const statemesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b);

    //draw map on svg
mapsvg.append("g")
  .selectAll("path")
  .data(counties.features)
  .join("path")
  .attr("class", "county")
  .attr("fill", d => {
      const v = valuemap.get(cleanID(d.id));
      return v != null ? color(v) : "#cacaca";
  })
  .attr("d", path)
  .append("title")
  .text(d => {
      const v = valuemap.get(cleanID(d.id));
      return v != null
        ? `${d.properties.name}: ${v}%`
        : `${d.properties.name}: No data`;
  });

    //draw states on map
    mapsvg.append("path")
        .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        .attr("fill", "none")
        .attr("stroke", "white")
        .attr("stroke-linejoin", "round")
        .attr("d", path)
        .attr("stroke", "black")
        .attr("stroke-width", 0.2);

    //make legend
    const legend = mapsvg.append("g")
        .attr("transform", `translate(${width - 145}, ${height - 50})`);

    //append title to legend
    legend.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .text("Prevalence (%)")
    .style("font-size", "10px")
    .style("font-weight", "bold");

    //object with data + labels for legend
    const legendData = color.range();

    //make data squares for legend
    legend.selectAll("rect")
    .data(legendData)
    .join("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 12)
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", d => d);

    //make data labels for legend
    legend.selectAll(".legend-label")
    .data(legendData)
    .join("text")
    .attr("class", "legend-label")
    .attr("x", 15)
    .attr("y", (d, i) => i * 12 + 9)
    .text((d, i) => {
        const domain = color.domain();
        const step = (domain[1] - domain[0]) / color.range().length;
        const start = domain[0] + i * step;
        const end = start + step;
        return `${Math.round(start)}–${Math.round(end)}%`;
    })
    .style("font-size", "10px");

    return mapsvg.node();

}

function updateMap() {
    const color = d3.scaleQuantize([10, 35], d3.schemePurples[7].slice(2));

    const filtered = mapData.filter(d => +d.year === +selectedYear);

    const valuemap = new Map(
        filtered.map(d => [cleanID(d.countyID), d.value])
    );

    // UPDATE FILL
    mapsvg.selectAll("path.county")
        .transition()
        .duration(500)
        .attr("fill", d => {
            const v = valuemap.get(cleanID(d.id));
            return v != null ? color(v) : "#cacaca";
        });

    // UPDATE TOOLTIP
    mapsvg.selectAll("path.county")
        .select("title")
        .text(d => {
            const v = valuemap.get(cleanID(d.id));
            return v != null
                ? `${d.properties.name}: ${v}%`
                : `${d.properties.name}: No data`;
        });
}


function createRedVis() {
    redditsvg.selectAll("*").remove();

    // further data processing
    const visibleCasesData = r_casesData_perday.filter(d => {
        return d.date >= r_selectedDateRange[0] && d.date <= r_selectedDateRange[1];
    });

    const casesByDate = new Map(
        visibleCasesData.map(d => [+d.date, d.cases])
    );

    const visibleEventData = r_eventData.filter(d => {
        return d.date >= r_selectedDateRange[0] && d.date <= r_selectedDateRange[1];
    });


    const visibleSentimentData = r_sentimentData.filter(d => {
        return r_visibleSubreddits.includes(d.subreddit)
            && d.date >= r_selectedDateRange[0]
            && d.date <= r_selectedDateRange[1];
    });

    const sentimentPostPerDay = d3.rollups(
        visibleSentimentData,
        rows => {
            return {
                totalPosts: d3.sum(rows, d => d.totalPosts),
                positivePosts: d3.sum(rows, d => d.positivePosts),
                negativePosts: d3.sum(rows, d => d.negativePosts)
            };
        },
        d => d.subreddit,
        d => +d.date
    ).map(([subreddit, values]) => {
        return {
            sub: subreddit,
            values: values.map(([date, posts]) => {
                return {
                    date: new Date(date),
                    numbOfPosts: posts.totalPosts,
                    positivePosts: posts.positivePosts,
                    negativePosts: posts.negativePosts,
                    positivePercent: posts.totalPosts ? posts.positivePosts / posts.totalPosts : 0,
                    negativePercent: posts.totalPosts ? posts.negativePosts / posts.totalPosts : 0
                };
            }).sort((a, b) => a.date - b.date)
        };
    });

    console.log(sentimentPostPerDay);

    const wrapText = (text, width) => {
        text.each(function() {
            const text = d3.select(this);
            const words = text.text().split(/\s+/).reverse();
            const x = text.attr("x");
            const y = text.attr("y");
            const lineHeight = 10;
            let line = [];
            let lineNumber = 0;
            let word = words.pop();
            let tspan = text.text(null)
                .append("tspan")
                .attr("x", x)
                .attr("y", y);

            while (word) {
                line.push(word);
                tspan.text(line.join(" "));

                if (tspan.node().getComputedTextLength() > width && line.length > 1) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan")
                        .attr("x", x)
                        .attr("y", y)
                        .attr("dy", `${++lineNumber * lineHeight}px`)
                        .text(word);
                }

                word = words.pop();
            }
        });
    };


    const x = d3.scaleTime()
        .domain(r_selectedDateRange)
        .range([0, width]);

    const maxCases = d3.max(visibleCasesData, d => d.cases) ?? 0;
    const maxPosts = d3.max(sentimentPostPerDay, d => d3.max(d.values, v => v.numbOfPosts)) ?? 0;

    const y = d3.scaleLinear()
        .domain([0, maxCases])
        .nice()
        .range([height, 0]);

    const yPosts = d3.scaleLinear()
        .domain([0, maxPosts])
        .nice()
        .range([height, 0]);

    const sentimentBarHeight = d3.scaleLinear()
        .domain([0, 1])
        .range([0, 45]);

    const createArea = () => {
        return d3.area()
            .x(d => x(d.date))
            .y0(height)
            .y1(d => y(d.cases));
    };

    const chart = redditsvg.append('g');
    let sentimentBreakdownActive = false;

    const resetTrendlines = () => {
        sentimentBreakdownActive = false;
        chart.selectAll(".sentiment-breakdown").remove();
        chart.selectAll(".sub-trendlines")
            .attr("display", null);
        hideTooltip();
    };

    chart.append("rect")
        .attr("class", "chart-click-reset")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "transparent")
        .on("click", resetTrendlines);

    // draw cases
    chart.append("path")
            .datum(visibleCasesData)
            .attr("class", "cases-area")
            .attr("opacity", 1)
            .attr("fill", "#9cc7ff")
            .attr("stroke", "#c2dcff")
            .attr("stroke-opacity", 0.8)
            .style("stroke-width", "0.5px")
            .attr("d", createArea());

    chart.selectAll(".event-line")
            .data(visibleEventData)
            .join("line")
            .attr("class", "event-line")
            .attr("x1", d => x(d.date))
            .attr("x2", d => x(d.date))
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke", "#002c66")
            .attr("stroke-width", "2px")
            .attr("opacity", 0.3);

    const eventLabels = chart.selectAll(".event-label")
            .data(visibleEventData)
            .join("g")
            .attr("class", "event-label")
            .attr("transform", (d) => {
                return `translate(${x(d.date)})`;
            });

    eventLabels.append("rect")
            .attr("x", -40)
            .attr("y", -40)
            .attr("width", 80)
            .attr("height", 40)
            .attr("fill", "white")
            .attr("stroke", "#002c66")
            .attr("stroke-width", 1);

    eventLabels.append("text")
            .attr("x", 0)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .style("font-size", "8px")
            .style("fill", "#002c66")
            .text(d => d.event)
            .call(wrapText, 60);

    eventLabels.append("title")
            .text(d => d.event);

    // draw trendlines

    const line = d3.line()
        .x(d => x(d.date))
        .y(d => yPosts(d.numbOfPosts));

    const trendlines = chart.selectAll(".sub-trendlines")
        .data(sentimentPostPerDay)
        .enter()
        .append("g")
        .attr("class", "sub-trendlines");

    const drawSentimentBreakdown = selectedSubreddit => {
        sentimentBreakdownActive = true;
        chart.selectAll(".sentiment-breakdown").remove();

        chart.selectAll(".sub-trendlines")
            .attr("display", d => d.sub === selectedSubreddit.sub ? null : "none");

        const breakdown = chart.append("g")
            .attr("class", "sentiment-breakdown");

        const showSentimentTooltip = (event, d, sentimentType) => {
            const caseCount = casesByDate.get(+d.date) ?? 0;
            showTooltip(event, `
                <strong>Subreddit: r/${selectedSubreddit.sub}</strong><br>
                Date: ${formatDate(d.date)}<br>
                Total Posts: ${formatComma(d.numbOfPosts)}<br>
                Positive: ${d3.format(".0%")(d.positivePercent)}<br>
                Negative: ${d3.format(".0%")(d.negativePercent)}<br>
                New COVID Cases: ${formatComma(caseCount)}<br>
            `);
        };

        breakdown.selectAll(".positive-sentiment-bar")
            .data(selectedSubreddit.values)
            .join("rect")
            .attr("class", "positive-sentiment-bar")
            .attr("x", d => x(d.date) - 4)
            .attr("y", d => yPosts(d.numbOfPosts) - sentimentBarHeight(d.positivePercent))
            .attr("rx", 2)
            .attr("width", 9)
            .attr("height", d => sentimentBarHeight(d.positivePercent))
            .attr("fill", "#d62728")
            .attr("opacity", 0.8)
            .on("mousemove", (event, d) => {
                showSentimentTooltip(event, d, "Positive sentiment");
            })
            .on("mouseleave", hideTooltip);

        breakdown.selectAll(".negative-sentiment-bar")
            .data(selectedSubreddit.values)
            .join("rect")
            .attr("class", "negative-sentiment-bar")
            .attr("x", d => x(d.date) - 4)
            .attr("y", d => yPosts(d.numbOfPosts))
            .attr("rx", 2)
            .attr("width", 9)
            .attr("height", d => sentimentBarHeight(d.negativePercent))
            .attr("fill", "#1f77b4")
            .attr("opacity", 0.8)
            .on("mousemove", (event, d) => {
                showSentimentTooltip(event, d, "Negative sentiment");
            })
            .on("mouseleave", hideTooltip);
    };

    trendlines.append("path")
        .attr("class", "trendline")
        .attr("fill", "none")
        .attr("stroke", d => subColor(d.sub))
        .attr("stroke-width", 2.5)
        .attr("d", d => line(d.values))
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            event.stopPropagation();
            drawSentimentBreakdown(d);
        });

    trendlines.selectAll(".trendline-hover-point")
        .data(d => d.values.map(v => ({ ...v, sub: d.sub })))
        .enter()
        .append("circle")
        .attr("class", "trendline-hover-point")
        .attr("cx", d => x(d.date))
        .attr("cy", d => yPosts(d.numbOfPosts))
        .attr("r", 5)
        .attr("fill", d => subColor(d.sub))
        .attr("opacity", 0)
        .on("click", (event, d) => {
            event.stopPropagation();
            const selectedSubreddit = sentimentPostPerDay.find(s => s.sub === d.sub);
            drawSentimentBreakdown(selectedSubreddit);
        })
        .on("mousemove", (event, d) => {
            if (sentimentBreakdownActive) {
                return;
            }

            const caseCount = casesByDate.get(+d.date) ?? 0;
            showTooltip(event, `
                <strong>Subreddit: r/${d.sub}</strong><br>
                Date: ${formatDate(d.date)}<br>
                Total Posts: ${formatComma(d.numbOfPosts)}<br>
                New COVID Cases: ${formatComma(caseCount)}
            `);
        })
        .on("mouseenter", function() {
            d3.select(this).attr("opacity", 1);
        })
        .on("mouseleave", function() {
            d3.select(this).attr("opacity", 0);
            if (!sentimentBreakdownActive) {
                hideTooltip();
            }
        });


    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    chart.append("g")
        .call(d3.axisLeft(y));



    // TODO: Implement the Reddit visualization
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
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
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
            .attr("opacity", 0.9)
            .append("title")
            .text(d => `${d.label} years: mean ${fmt(d.mean)} (${d3.format(",")(d.n)} respondents)`);

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
