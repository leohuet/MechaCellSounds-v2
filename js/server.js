var rows = ['Zc', 'E0Tn', 'betaTn'];

var temp_arrayf = new Array(3);
var moyenne_array = new Array(3);

var all_data = [];
var map_size = 0;
var csvDone = new Array(cells.length).fill(false);

let D_dict = {
    'Zc_array': [],
    'E0Tn_array': [],
    'betaTn_array': [],
}

let DD_dict = {
    'Zc_2D_array': [],
    'E0Tn_2D_array': [],
    'betaTn_2D_array': [],
}

var cells = ["macrophage1", "macrophage2", "monocyte1", "monocyte2"]

let fetch_url = "https://raw.githubusercontent.com/leohuet/MechaCellSounds-v2/main/data";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
	// Go through all the data to retrieve min and max values for each cell
	var beta_maxs = [];
	var emodulus_maxs = [];
	var beta_mins = [];
	var emodulus_mins = [];

	for(var i=0; i<all_data.length; i++){
		var emodulus_max = all_data[i]['E0Tn_array'][0];
		var emodulus_min = all_data[i]['E0Tn_array'][0];
		for(var e=0; e<all_data[i]['E0Tn_array'].length; e++){
			if(all_data[i]['E0Tn_array'][e] > emodulus_max){
				emodulus_max = all_data[i]['E0Tn_array'][e];
			}
			if(all_data[i]['E0Tn_array'][e] < emodulus_min){
				emodulus_min = all_data[i]['E0Tn_array'][e];
			}
		}
		emodulus_maxs.push(emodulus_max);
		emodulus_mins.push(emodulus_min);

		var beta_max = all_data[i]['betaTn_array'][0];
		var beta_min = all_data[i]['betaTn_array'][0];
		for(var b=0; b<all_data[i]['betaTn_array'].length; b++){
			if(all_data[i]['betaTn_array'][b] > beta_max){
				beta_max = all_data[i]['betaTn_array'][b];
			}
			if(all_data[i]['betaTn_array'][b] < beta_min){
				beta_min = all_data[i]['betaTn_array'][b];
			}
		}
		beta_maxs.push(beta_max);
		beta_mins.push(beta_min);
	}
	
	// Get the min and max values from all cells and output it to the max patch
	let the_emodulus_min = Math.min.apply(null, emodulus_mins);
	let the_emodulus_max = Math.max.apply(null, emodulus_maxs);
	let the_beta_min = Math.min.apply(null, beta_mins);
	let the_beta_max = Math.max.apply(null, beta_maxs);

    console.log(the_emodulus_min, the_emodulus_max, the_beta_min, the_beta_max);

    let temp_data = structuredClone(all_data);

    // remap data between min and max values
    for(var d=0; d<all_data.length; d++){
        for(var a=0; a<(map_size*map_size); a++){
            all_data[d]['E0Tn_array'][a] = (temp_data[d]['E0Tn_array'][a] - the_emodulus_min) / (the_emodulus_max - the_emodulus_min);
            all_data[d]['betaTn_array'][a] = (temp_data[d]['betaTn_array'][a] - the_beta_min) / (the_beta_max - the_beta_min);
        }
    }

    temp_data = structuredClone(all_data);
	
	for(var j=0; j<all_data.length; j++){
		// Rebuild the arrays in the dict to re order the data into 2D arrays
		var i = 0;
		for(var index=0; index < rows.length; index++){
			var selected_row = rows[index];
			i = 0;
			for(var y=0; y<map_size; y++){
				if(y%2 == 0){
					for(var x1=0; x1<map_size; x1++){
						DD_dict[selected_row + '_2D_array'][x1][y] = temp_data[j][selected_row + '_array'][i];
						i = i + 1;
					}
				}
				else{
					for(var x2=map_size-1; x2>=0; x2--){
						DD_dict[selected_row + '_2D_array'][x2][y] = temp_data[j][selected_row + '_array'][i];
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
        const filePath = `${fetch_url}/${cell}.csv`;
        const data = await readCSV(filePath, cell);
        map_size = Math.ceil(Math.sqrt(data.length));

        for(var index=0; index < rows.length; index++){
            var selected_row = rows[index];
            for(var x=0; x<map_size; x++){
                DD_dict[selected_row + '_2D_array'][x] = [];	
                for(var y=0; y<map_size; y++){
                    DD_dict[selected_row + '_2D_array'][x][y] = 0;
                }
            }
        }
        // Split each line into 3 cells and assing them to the array
        for(var j=0; j < data.length; j++){
            D_dict['Zc_array'][j] = parseFloat(data[j]['Zc']);
            D_dict['E0Tn_array'][j] = data[j]['E0Tn'] >= 1 ? parseFloat(Math.log(data[j]['E0Tn']) / Math.log(10)) : 0;
            D_dict['betaTn_array'][j] = parseFloat(data[j]['betaTn']);          
        }

        // Append the dictionnary to an array containing all the cells data
        all_data.push(structuredClone(D_dict));
    }
}

init().then(() => {
    console.log('All CSVs read');
    filter_data();
});