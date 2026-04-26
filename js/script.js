console.log('D3 Version:', d3.version);

let allData = []
let xScale, yScale, sizeScale
const t = 1000; // 1000ms = 1 second

let xVar = 'income', yVar = 'lifeExp', sizeVar = 'population', targetYear = 2000
const options = ['income', 'lifeExp', 'gdp', 'population', 'childDeaths']
const continents = ['Africa', 'Asia', 'Oceania', 'Americas', 'Europe']
const colorScale = d3.scaleOrdinal(continents, d3.schemeSet2); // d3.schemeSet2 is a set of predefined colors.

//make margins
const margin = {top: 40, right: 40, bottom: 60, left: 60};
const width = 950 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;


//load data after page is loaded
function init(){
    d3.csv("./data/gapminder_subset.csv", function(d){
        return {  
        // Besides converting the types, we also simpilify the variable names here. 
        country: d.country,
        continent: d.continent,
        year: +d.year, // using + to convert to numbers; same below
        lifeExp: +d.life_expectancy, 
        income: +d.income_per_person, 
        gdp: +d.gdp_per_capita, 
        childDeaths: +d.number_of_child_deaths,
        population: +d.population,
        // Your turn: 
        // convert d.population, and assign it to population
     }
    })
    .then(data => {
           // console.log(data)
            allData = data
            // placeholder for building vis
            // placeholder for adding listerners

            setupSelector()
            
            // Initial rendering steps:
            // P.S. You could move these into setupSelector(), 
            // but calling them separately makes the flow clearer.
            updateAxes()
            updateVis()
            addLegend()
        })
    .catch(error => console.error('Error loading data:', error));
}

function setupSelector(){
  // Handles UI changes (sliders, dropdowns)
  // Anytime the user tweaks something, this function reacts.
  // May need to call updateAxes() and updateVis() here when needed!
let slider = d3
        .sliderHorizontal()
        .min(d3.min(allData.map(d => +d.year))) // setup the range
        .max(d3.max(allData.map(d => +d.year))) // setup the range
        .step(1)
        .width(width)  // Widen the slider if needed
        .displayValue(false)
    .on('onchange', (val) => {
       targetYear = +val // Update the year
       updateVis() // Refresh the chart
    });

    slider.default([targetYear])

    d3.select('#slider')
        .append('svg')
        .attr('width', width)  // Adjust width if needed
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)')
        .call(slider);

    d3.selectAll('.variable')
   // loop over each dropdown button
    .each(function() {
        d3.select(this).selectAll('myOptions')
        .data(options)
        .enter()
        .append('option')
        .text(function (d) {  //returns new label based on option label
            if(d == "income")
                return "Income"
            else if(d == "lifeExp")
                return "Life Expectancy"
            else if(d == "gdp")
                return "GDP"
            else if(d == "population")
                return "Population"
            else if(d == "childDeaths")
                return "Child Deaths"
        })
        .attr("value", d => d) // The actual value used in the code

    // select all dropdown buttons
d3.selectAll('.variable')
    .each(function() {
        // ... Loop over each dropdown button
    })
    .on("change", function (event) {
        // Placeholder: we’ll change xVar, yVar, or sizeVar here
        console.log(d3.select(this).property("id")) // Logs which dropdown (e.g., xVariable)
        console.log(d3.select(this).property("value")) // Logs the selected value
        
        let targetVar = d3.select(this).property("id")
        let value = d3.select(this).property("value")

        if(targetVar == "xVariable")
            xVar = value
        else if(targetVar == "yVariable")
            yVar = value
        else
            sizeVar = value

        svg.selectAll('.axis').remove()
        svg.selectAll('.labels').remove()
        updateAxes();
        updateVis();
    })

})

d3.select('#xVariable').property('value', xVar)
d3.select('#yVariable').property('value', yVar)
d3.select('#sizeVariable').property('value', sizeVar)
}

function updateAxes(){
  // Draws the x-axis and y-axis
  // Adds ticks, labels, and makes sure everything lines up nicely

  // Create x scale
xScale = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d[xVar])])
    .range([0, width - 120]);
const xAxis = d3.axisBottom(xScale)

svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`) // Position at the bottom
    .call(xAxis);

//create y scale
yScale = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d[yVar])])
    .range([height, 0]);
const yAxis = d3.axisLeft(yScale)

svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,0)`) // Position at the bottom
    .call(yAxis);

sizeScale = d3.scaleSqrt()
    .domain([0, d3.max(allData, d => d[sizeVar])]) // Largest bubble = largest data point 
    .range([5, 20]); // Feel free to tweak these values if you want bigger or smaller bubbles

    // X-axis label
svg.append("text")
    .attr("x", ((width ) / 2) - 80)
    .attr("y", height + margin.bottom - 20)
    .attr("text-anchor", "middle")
    .text(xVar) // Displays the current x-axis variable
    .attr('class', 'labels')

// Y-axis label (rotated)
svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", margin.left - 90)
    .attr("text-anchor", "middle")
    .text(yVar) // Displays the current y-axis variable
    .attr('class', 'labels')
}

function updateVis(){
  // Draws (or updates) the bubbles
let currentData = allData.filter(d => d.year === targetYear)

svg.selectAll('.points')
    // Why use d => d.country as the key?
    // Because each country is unique in the dataset for the current year. 
    // This helps D3 know which bubbles to keep, update, or remove.
    .data(currentData, d => d.country)
    .join(
        function(enter){
             // New data points go here
            return enter
            .append('circle')
            .attr('class', 'points')
            .attr('cx', d => xScale(d[xVar])) // Position on x-axis
            .attr('cy', d => yScale(d[yVar])) // Position on y-axis
            .style('fill', d => colorScale(d.continent))
            .style('opacity', .5) // Slight transparency for better visibility
            .attr('r', 0) // before transition r = 0
            .on('mouseover', function (event, d) {
                console.log(d) // See the data point in the console for debugging
                d3.select('#tooltip')
                    .style("display", 'block') // Make the tooltip visible
                    .html( // Change the html content of the <div> directly
                    `<strong>${d.country}</strong><br/>
                    Continent: ${d.continent}`)
                    .style("left", (event.pageX + 20) + "px")
                    .style("top", (event.pageY - 28) + "px");
                d3.select(this) // Refers to the hovered circle
                .style('stroke', 'black')
                .style('stroke-width', '4px')
            })
            .on("mouseout", function (event, d) {
                d3.select('#tooltip')
                .style('display', 'none') // Hide tooltip when cursor leaves
                 d3.select(this) // Refers to the hovered circle
                .style('stroke', 'black')
                .style('stroke-width', '0px')
            })
            .transition(t)
            .attr('r', d => sizeScale(d[sizeVar]))
        },
        function(update){
             // Existing points get updated here
            return update
            .transition(t)
            .attr('cx', d => xScale(d[xVar]))
            .attr('cy', d => yScale(d[yVar]))
            .attr('r',  d => sizeScale(d[sizeVar]))
        },
        function(exit){
             // Old points get removed here
            exit
            .transition(t)
            .attr('r', 0)  // Shrink to radius 0
            .remove()
        }
    )
}

function addLegend(){
 // Adds a legend so users can decode colors
    let size = 10  // Size of the legend squares
    svg.selectAll('continentSquare')
    .data(continents)
    .enter()
    .append("rect")
    .attr("x", (d,i) => i * (size + 100) + 100)
    .attr("y", -margin.top/2) 
    .attr("width", size)
    .attr("height", size)
    .style("fill", d => colorScale(d))

      svg.selectAll("continentName")
        .data(continents)
        .enter()
        .append("text")
        .attr("y", -margin.top/2 + size) // Align vertically with the square
        .attr("x", (d, i) => i * (size + 100) + 120)  
        .style("fill", d => colorScale(d))  // Match text color to the square
        .text(d => d) // The actual continent name
        .attr("text-anchor", "left")

}

window.addEventListener('load', init);

// Create SVG
const svg = d3.select('#map-vis')
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