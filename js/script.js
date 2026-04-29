console.log('D3 Version:', d3.version);

let mapData = []
let selectedYear = 2020

const t = 1000; // 1000ms = 1 second

//make margins
const margin = {top: 40, right: 40, bottom: 60, left: 60};
const width = 950 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const cleanID = d => String(d).replace(/^0+/, "");

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


window.addEventListener('load', init);

// Create map SVG
const mapsvg = d3.select('#map-vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', null);

// Create reddit SVG
const redditsvg = d3.select('#reddit-vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

d3.select("#story-btn")
    .on("click", function () {
        d3.select("#story-btn").remove();
        createSVG1();
    }
);

function createSVG1() {

    const newSvg = d3.select("#story-vis")
        .append("svg")  
        .attr("width", width)
        .attr("height", height)

    const newButton = d3.select("#story-vis")
        .append("button")
        .text("Button from SVG1")

    newButton.on("click", function () {
        d3.select(this).attr("disabled", true);
        createSVG2()
    });
        
}

function createSVG2() {

    const newSvg = d3.select("#story-vis")
        .append("svg")  
        .attr("width", width)
        .attr("height", height)

    const newButton = d3.select("#story-vis")
        .append("button")
        .text("Button from SVG2")

    newButton.on("click", function () {
        d3.select(this).attr("disabled", true);
        createSVG3()
    });
        
}

function createSVG3() {

    const newSvg = d3.select("#story-vis")
        .append("svg")   
        .attr("width", width)
        .attr("height", height)

}