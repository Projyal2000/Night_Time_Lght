// Google Earth Engine Script for Night Time Lights in West Bengal
// This script uses VIIRS Day/Night Band data for night lights analysis

// Define the region of interest - West Bengal, India
var westBengal = ee.FeatureCollection("FAO/GAUL/2015/level1")
  .filter(ee.Filter.eq('ADM1_NAME', 'West Bengal'));

// Print the region to verify
print('West Bengal boundary:', westBengal);

// Center the map on West Bengal
Map.centerObject(westBengal, 7);

// Add West Bengal boundary to the map
Map.addLayer(westBengal, {color: 'red'}, 'West Bengal Boundary');

// Function to get VIIRS Night Time Lights data
function getVIIRSNightLights(year, month) {
  // VIIRS Day/Night Band Monthly Composites
  var collection = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG')
    .filter(ee.Filter.calendarRange(year, year, 'year'))
    .filter(ee.Filter.calendarRange(month, month, 'month'))
    .select('avg_rad');
  
  return collection.mean().rename('night_light');
}

// Function to get DMSP-OLS Night Time Lights data (historical)
function getDMSPNightLights(year) {
  var collection = ee.ImageCollection('NOAA/DMSP-OLS/NIGHTTIME_LIGHTS')
    .filter(ee.Filter.calendarRange(year, year, 'year'))
    .select('stable_lights');
  
  return collection.mean().rename('night_light');
}

// Define analysis parameters
var startYear = 2020;
var endYear = 2023;
var targetMonth = 1; // January (to avoid cloud cover)

// Create a list of years
var years = ee.List.sequence(startYear, endYear);

// Create annual night light composites
var nightLightCollection = ee.ImageCollection.fromImages(
  years.map(function(year) {
    var image = getVIIRSNightLights(year, targetMonth);
    return image.set('year', year);
  })
);

print('Night Light Collection:', nightLightCollection);

// Calculate mean night lights for the entire period
var meanNightLights = nightLightCollection.mean().clip(westBengal);

// Calculate night light change over time
var firstYearImage = getVIIRSNightLights(startYear, targetMonth).clip(westBengal);
var lastYearImage = getVIIRSNightLights(endYear, targetMonth).clip(westBengal);
var nightLightChange = lastYearImage.subtract(firstYearImage).rename('change');

// Visualization parameters for night lights
var nightLightVis = {
  min: 0,
  max: 50,
  palette: ['#000000', '#1a1a00', '#333300', '#4d4d00', '#666600', '#808000', 
  '#999900', '#b3b300', '#cccc00', '#e6e600', '#ffff00']
};

// Visualization for change detection
var changeVis = {
  min: -10,
  max: 10,
  palette: ['red', 'black', 'green']
};

// Add layers to the map
Map.addLayer(meanNightLights, nightLightVis, 'Mean Night Lights (2020-2023)');
Map.addLayer(firstYearImage, nightLightVis, 'Night Lights ' + startYear);
Map.addLayer(lastYearImage, nightLightVis, 'Night Lights ' + endYear);
Map.addLayer(nightLightChange, changeVis, 'Night Light Change (' + startYear + '-' + endYear + ')');

// Calculate statistics for West Bengal
var meanStats = meanNightLights.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: westBengal,
  scale: 500,
  maxPixels: 1e9
});

var maxStats = meanNightLights.reduceRegion({
  reducer: ee.Reducer.max(),
  geometry: westBengal,
  scale: 500,
  maxPixels: 1e9
});

print('Mean Night Light Intensity in West Bengal:', meanStats);
print('Maximum Night Light Intensity in West Bengal:', maxStats);

// Calculate night light statistics by district
var districts = ee.FeatureCollection("FAO/GAUL/2015/level2")
  .filter(ee.Filter.eq('ADM1_NAME', 'West Bengal'));

print('Districts in West Bengal:', districts);

var districtStats = meanNightLights.reduceRegions({
  collection: districts,
  reducer: ee.Reducer.mean(),
  scale: 500,
});

print('District-wise Night Light Statistics:', districtStats);


// Create a time series chart
var timeSeries = ui.Chart.image.series({
  imageCollection: nightLightCollection,
  region: westBengal,
  reducer: ee.Reducer.mean(),
  scale: 500,
  xProperty: 'year'
})
.setChartType('LineChart')
.setOptions({
  title: 'West Bengal Night Light Time Series (2020-2023)',
  hAxis: {title: 'Year'},
  vAxis: {title: 'Night Light Intensity'},
  lineWidth: 2,
  pointSize: 4
});

print(timeSeries);

// Add legend
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

var legendTitle = ui.Label({
  value: 'Night Light Intensity',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
});

legend.add(legendTitle);

// Create the legend content
var makeColor = function(color) {
  return ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });
};

var values = ['0 (Dark)', '10', '20', '30', '40', '50 (Bright)'];

var palette = nightLightVis.palette;

for (var i = 0; i < 6; i++) {
  var color = makeColor(palette[i * 2]);
  var value = ui.Label({
    value: values[i],
    style: {margin: '0 0 4px 6px'}
  });
  
  legend.add(ui.Panel({
    widgets: [color, value],
    layout: ui.Panel.Layout.Flow('horizontal')
  }));
}

Map.add(legend);

// Print usage instructions
print('Instructions:');
print('1. The script shows night light data for West Bengal from 2020-2023');
print('2. Use the layer selector to toggle different visualizations');
print('3. Green areas in change detection show increased light intensity');
print('4. Red areas show decreased light intensity');