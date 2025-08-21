var rows = ['Zc', 'E0Tn', 'betaTn'];
var cells = ["macrophage1", "macrophage2", "monocyte1", "monocyte2"]

var temp_arrayf = new Array(3);
var moyenne_array = new Array(3);

var all_data = [];
var map_size = 0;
var csvDone = new Array(cells.length).fill(false);

let D_dict = {
    'map_size': 0,
    'Zc_array': [],
    'E0Tn_array': [],
    'betaTn_array': [],
}

let DD_dict = {
    'map_size': 0,
    'Zc_2D_array': [],
    'E0Tn_2D_array': [],
    'betaTn_2D_array': [],
}

let fetch_url = "https://raw.githubusercontent.com/leohuet/MechaCellSounds-v2/main/data";


// variables for vitesse and mean measure
let dataforVitesse = [[0.5, 0.5, 0], [0.5, 0.5, 0]];
let mean_v_list = [];
let mean_length = 0;
let vitesse_moyenne = 0;
let old_x = 0;
let last_point = [0.5, 0.5, 0];

// variables for mechanical properties
let stiffonoff = true;
let viscousonoff = true;
let elasticonoff = true;
let stiffness = 0;
let viscosity = 0;
let elasticity = 0;
let filtered_viscosity = 0;
let old_viscosity = 0.25;
let old_int_stiff = 0;

let envelop_changes = 0;

// variables for granular synthesis
const toAudioProcessValues = {
    touch: 0,
    stiffness: 0,
    stiffnessOnOff: 1,
    viscosity: 0,
    viscosityOnOff: 1,
    elasticity: 0,
    elasticityOnOff: 1,
    soundFile: 10,
    frequency: 15,
    grainSize: 0.01,
    transpose: true,
};



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



//                                                              //
//      FUNCTIONS FOR CSV READING AND ARRAY MANIPULATION        //
//                                                              //

async function readCSV(filePath) {
    return new Promise((resolve, reject) => {
      fetch(filePath)
        .then((res) => res.text())
        .then((text) => {
          const parsed = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
          });
          resolve(parsed.data);
        })
        .catch(reject);
    });
}


function filter_data(){
    let temp_data = structuredClone(all_data);
	for(var j=0; j<all_data.length; j++){
		// Rebuild the arrays in the dict to re order the data into 2D arrays
		var i = 0;
        if(cells[j].indexOf("macrophage") > -1 || cells[j].indexOf("monocyte") > -1){
            for(var index=0; index < rows.length; index++){
                var selected_row = rows[index];
                i = 0;
                for(var y=0; y<temp_data[j]['map_size']; y++){
                    if(y%2 == 0){
                        for(var x1=0; x1<temp_data[j]['map_size']; x1++){
                            DD_dict[selected_row + '_2D_array'][x1][y] = temp_data[j][selected_row + '_array'][i];
                            i = i + 1;
                        }
                    }
                    else{
                        for(var x2=temp_data[j]['map_size']-1; x2>=0; x2--){
                            DD_dict[selected_row + '_2D_array'][x2][y] = temp_data[j][selected_row + '_array'][i];
                            i = i + 1;
                        }
                    }
                }
            }
        }
        else if(cells[j].indexOf("cancerous") > -1){
            for(var index=0; index < rows.length; index++){
                var selected_row = rows[index];
                i = 0;
                for(var y=0; y<temp_data[j]['map_size']; y++){
                    for(var x3=0; x2<temp_data[j]['map_size']; x3++){
                        DD_dict[selected_row + '_2D_array'][x3][y] = temp_data[j][selected_row + '_array'][i];
                        i = i + 1;
                    }
                }
            }
        }

        // Replace the array into all_data to the 2Darray
		all_data[j] = structuredClone(DD_dict);
	}
}

async function init(){
    for(var cell=0; cell<cells.length; cell++){
        // Read the csv file from the path in argument
        const filePath = `${fetch_url}/${cells[cell]}.csv`;
        const data = await readCSV(filePath);
        D_dict['map_size'] = Math.ceil(Math.sqrt(data.length));

        // Split each line into 3 cells and assing them to the array
        for(var j=0; j < data.length; j++){
            D_dict['Zc_array'][j] = parseFloat(data[j]['Zc']);
            D_dict['E0Tn_array'][j] = parseFloat(data[j]['E0Tn']);
            D_dict['betaTn_array'][j] = parseFloat(data[j]['betaTn']);
        }

        DD_dict['map_size'] = D_dict['map_size'];
        for(var index=0; index < rows.length; index++){
            var selected_row = rows[index];
            for(var x=0; x<D_dict['map_size']; x++){
                DD_dict[selected_row + '_2D_array'][x] = [];
                for(var y=0; y<D_dict['map_size']; y++){
                    DD_dict[selected_row + '_2D_array'][x][y] = 0;
                }
            }
        }

        // Append the dictionnary to an array containing all the cells data
        all_data.push(structuredClone(D_dict));
    }
}


//                                                     //
//      FUNCTIONS FOR TOUCH AND MOUSE EVENTS           //
//                                                     //

let granularOn = false;

var on_cell = function on_cell(cellornot){
    touch_cell = cellornot;
};

// Functions triggered when client touches the screen
document.getElementById("sketch").addEventListener("touchstart", function(){
    showLegende(0);
    toAudioProcessValues.touch = 1;
    if(user_launched && is_on_cell()){
        granularOn = true;
        startGranular();
    }
});
document.body.addEventListener("touchend", function(){
    if(user_launched && granularOn){
        granularOn = false;
        toAudioProcessValues.touch = 0;
        stopGranular();
    }
});

document.getElementById("sketch").addEventListener("mousedown", function(){
    showLegende(0);
    toAudioProcessValues.touch = 1;
    if(user_launched && is_on_cell()){
        granularOn = true;
        startGranular();
    }
});
document.body.addEventListener("mouseup", function(){
    if(user_launched && granularOn){
        granularOn = false;
        toAudioProcessValues.touch = 0;
        stopGranular();
    }
});




//                                                              //
//      FUNCTIONS FOR DATA RETRIEVING WHEN TOUCH INPUT          //
//                                                              //


function calculVitesse(onoff, point){
    const mean_size = 10;
    dataforVitesse[0] = point;
    if(onoff == 1){
        let d = Math.sqrt(Math.pow(dataforVitesse[1][0] - dataforVitesse[0][0], 2) + Math.pow(dataforVitesse[1][1] - dataforVitesse[0][1], 2));
        dataforVitesse[1] = point;
        if(mean_v_list.length == 500){
            mean_v_list = mean_v_list.slice(1);
            mean_v_list[499] = d;
        }
        else{
            mean_v_list.push(d);
            mean_length += 1;
        }
        if(mean_size > mean_length) fenetre = mean_length;
        else fenetre = mean_size;

        let sum = 0;
        for(let i=1; i<=fenetre; i++){
            sum += mean_v_list[mean_length - i];
        }
        vitesse_moyenne = (sum / fenetre)*10+1;
        if(vitesse_moyenne > 5) vitesse_moyenne = 5;
    }
    else{
        dataforVitesse[1] = [0.5, 0.5, 15];
        vitesse_moyenne = 0;
        mean_v_list = [];
        mean_length = 0;
    }
}

function points_distance(x, y, s){
	// Get all the points around the xy input within a chosen distance
	var distances = [0, Math.sqrt(2), Math.sqrt(2), Math.sqrt(8), Math.sqrt(8)];
	var center = 0;
	var points = [];
	if(s == 1 || s == 3){
		center = 0.5;
	}
	for(var x1=0; x1<all_data[cell-1]['map_size']; x1++){
		for(var y1=0; y1<all_data[cell-1]['map_size']; y1++){
			var distance = Math.sqrt(Math.pow(x+center-x1, 2)+ Math.pow(y+center-y1, 2));
			if(distance <= distances[s]){
				points.push(x1);
				points.push(y1);
			}
		}
	}
	return points;
}

function sort_values(x, y, s){
	var addition = [0, 0, 0];
    var new_x = Math.ceil(x*all_data[cell-1]['map_size']);
    var new_y = Math.ceil(y*-all_data[cell-1]['map_size']+all_data[cell-1]['map_size']);
	var xys = points_distance(new_x, new_y, s);
	// Retrieve the data at each point from xys array and add them in the addition array
	for(var j=0; j<xys.length/2; j++){
		for(var index=0; index < rows.length; index++){
			selected_row = rows[index];
			temp_arrayf[index] = all_data[cell-1][selected_row + '_2D_array'][xys[j*2]][xys[j*2+1]];
			addition[index] = addition[index] + temp_arrayf[index];
		}
	}

	// Measure each mean value for the 3 rows
	for(var e=0; e<addition.length; e++){
		moyenne = addition[e]/(xys.length/2);
		moyenne_array[e] = moyenne;
	}

    moyenne_array[1] = (2*moyenne_array[1] - 1)*vitesse_moyenne;
    if(moyenne_array[1] > 1) moyenne_array[1] = 1;
    if(moyenne_array[1] < -1) moyenne_array[1] = -1;
    moyenne_array[1] = (moyenne_array[1] + 1)/2;

    moyenne_array[2] = (2*moyenne_array[2] - 1)*vitesse_moyenne;
    if(moyenne_array[2] > 1) moyenne_array[2] = 1;
    if(moyenne_array[2] < -1) moyenne_array[2] = -1;
    moyenne_array[2] = (moyenne_array[2] + 1)/2;

    stiffness = moyenne_array[1].toFixed(3);
    console.log("stiffness: " + stiffness);
    viscosity = ((Math.sin((moyenne_array[2]*Math.PI)/2) * stiffness) / 0.35).toFixed(3);
    elasticity = (Math.cos((moyenne_array[2]*Math.PI)/2) * stiffness).toFixed(3);


}

function mapValues(){
    if(parseInt(stiffness*10) != old_int_stiff){
        old_int_stiff = parseInt(stiffness*10);
        toAudioProcessValues.soundFile = parseInt(stiffness*-11+11 + Math.random()*8);
    }
    if(stiffonoff){
        if(toAudioProcessValues.touch == 1){
            toAudioProcessValues.frequency = (stiffness*3+2) + vitesse_moyenne*2;
            toAudioProcessValues.grainSize = (viscosity*20+10) / 1000;
            filtered_viscosity = (parseFloat(viscosity) + parseFloat(old_viscosity)) / 2;
            toAudioProcessValues.stiffness = stiffness;
            toAudioProcessValues.viscosity = filtered_viscosity;
            toAudioProcessValues.elasticity = elasticity;
            old_viscosity = viscosity;
            envelop_changes = Math.floor(viscosity*-3+5);
            toAudioProcessValues.transpose = stiffness >= 0.5 ? true : false;
        }
        else{
            const startFrequency = toAudioProcessValues.frequency;
            const duration = viscosity*1000;
            const steps = 100;
            const increment = (0 - startFrequency) / steps;
            const interval = duration / steps;

            let currentStep = 0;

            const intervalId = setInterval(() => {
                if (currentStep < steps) {
                    toAudioProcessValues.frequency = startFrequency + increment * currentStep;
                    currentStep++;
                } else {
                    clearInterval(intervalId);
                }
            }, interval);
        }
    }
    else toAudioProcessValues.frequency = 5;
    changeGranularValues(toAudioProcessValues);
}

function send_xy(x, y, size){
    // message = `${user} ${x} ${y} ${size}`;
    let s = Math.ceil(((size-15)/30)*4);
    if(toAudioProcessValues.touch == 1 && x != old_x){
        old_x = x;
        last_point = [x, y, s];
        calculVitesse(toAudioProcessValues.touch, last_point);
        sort_values(x, y, s);
        mapValues();
    }
}

async function getAudioProcessValues(){
    return new Promise((resolve) => {
        resolve(toAudioProcessValues);
    });
}


//                                           //
//      END OF FUNCTION DECLARATION          //
//                                           //

init().then(() => {
    console.log('All CSVs read');
    filter_data();
	init_display(cells);
});