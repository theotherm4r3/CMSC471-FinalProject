# CMSC471 Final Project: The Mental Health Lifestyle 

This project explores mental health trends across the U.S. over the past few decades. It combines data from multiple sources, including Reddit, the CDC 500 Cities & PLACES dataset, and the CDC NHANES dataset, in order to provide a well-rounded view of the mental health crisis, including public response, geographic patterns, and demographic factors that contribute to increased risk of developing a mental health problem. We consider issues like age, sex, and lifestyle to understand who is most affected by the mental health crisis and how. We found that mental health subreddits have increased significantly since 2011, with depression and depression-related subreddits dominating. Certain areas of the U.S., such as the northwest and Appalachian regions, have higher rates of depression, although these rates appear to be going up in many places. 

## Member Contributions and Process
We split the work up by visualization: Alice worked on the Reddit visualization, Margaret worked on the map visualization, and Phani worked on the demographic visualizations. Individual reflections are recorded below. 

**Alice**: 

**Margaret**: For the map visualization, I wanted to avoid an issue that we had with a previous visualization, where it would take a long time to load due to frontloaded heavy data operations. Therefore, each year's data was manually copied and pasted into a single csv file that was then used as the data source for this site. The map itself was based on a sample visualization found online (https://observablehq.com/@d3/choropleth/2). This visualization utilizes filtering to select data for different years, panning/zooming to allow the user to view specific areas, and tooltips to display the details for specific counties on hover. I also worked on the overall layout of the webpage, creating a framework of divs and styles to unify our different visualizations at the beginning of the project and pulling them together into one story via captions and buttons at the end. 

**Phani**: 

## AI Usage
AI was used to assist in the development of this webpage. The basic layout and functionality was built manually, but for implementing advanced features such as dynamically updating which visualizations are visible, AI was consulted. 

## Extra Credit Features
Examples here...

## Data Sources
- [https://academictorrents.com/details/3e3f64dee22dc304cdd2546254ca1f8e8ae542b4](https://academictorrents.com/details/3e3f64dee22dc304cdd2546254ca1f8e8ae542b4)
- [https://data.cdc.gov/browse?category=500+Cities+%26+Places&q=2025&sortBy=relevance&tags=places&pageSize=20](https://www.cdc.gov/places/index.html)
- [https://wwwn.cdc.gov/nchs/nhanes/](https://wwwn.cdc.gov/nchs/nhanes/)

