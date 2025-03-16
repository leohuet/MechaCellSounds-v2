var app       =     require("express")();
var express   =     require("express");
var http      =     require('http').Server(app);
var io        =     require("socket.io")(http);
const path    =     require('path');
// const Max     =     require('max-api');
const os      =     require('os');
var fs        =     require('fs');
const csv     =     require('csv-parser');
const { clear } = require("console");

var users_dict = {
    'ids': [],
    'user_active': [1, 1, 1, 1, 1],
};

var cells = []

var files = fs.readdirSync(__dirname + '/data');
for(i in files) {
    if(files[i].split('.')[1] == 'xlsx'){
        cells.push(files[i].split('.')[0]);
    }
}

rows = ['Zc', 'E0Tn', 'betaTn'];

temp_arrayf = new Array(3);
moyenne_array = new Array(3);

var selection = 0;
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

let touch = 0;
let dataforVitesse = [[0.5, 0.5, 0], [0.5, 0.5, 0]];
let mean_v_list = [];
let mean_length = 0;
let vitesse_moyenne = 0;

let stiffness = 0;
let viscosity = 0;
let elasticity = 0;

let old_x = 0;
let last_point = [0.5, 0.5, 0];

// ========== Pages ========== //
// Allows acess to all files inside 'public' folder.
app.use(express.static(__dirname));

// Configures each link to a different page.
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/code/public/index.html');
});
app.get("/1", function(req, res) {
    res.sendFile(__dirname + '/code/public/1.html');
});
app.get("/2", function(req, res) {
    res.sendFile(__dirname + '/code/public/2.html');
});
app.get("/3", function(req, res) {
    res.sendFile(__dirname + '/code/public/3.html');
});
app.get("/4", function(req, res) {
    res.sendFile(__dirname + '/code/public/4.html');
});
app.get("/computer", function(req, res) {
    res.sendFile(__dirname + '/code/public/computer.html');
});


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readCSV(filePath, index) {
    return new Promise((resolve, reject) => {
        let csvData = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => csvData.push(row))
            .on('end', () => {
                csvDone[index] = true;
                resolve(csvData);
            })
            .on('error', (error) => reject(error));
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

    let temp_data = JSON.parse(JSON.stringify(all_data));

    // remap data between min and max values
    for(var d=0; d<all_data.length; d++){
        for(var a=0; a<(map_size*map_size); a++){
            all_data[d]['E0Tn_array'][a] = (temp_data[d]['E0Tn_array'][a] - the_emodulus_min) / (the_emodulus_max - the_emodulus_min);
            all_data[d]['betaTn_array'][a] = (temp_data[d]['betaTn_array'][a] - the_beta_min) / (the_beta_max - the_beta_min);
        }
    }

    temp_data = JSON.parse(JSON.stringify(all_data));
	
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
		all_data[j] = JSON.parse(JSON.stringify(DD_dict));
	}
}

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

/*function calculVitesse(onoff){
    const mean_size = 10;
    if(onoff == 1){
        setInterval(() => {
            dataforVitesse[0] = last_point;
            let d = Math.sqrt(Math.pow(dataforVitesse[1][0] - dataforVitesse[0][0], 2) + Math.pow(dataforVitesse[1][1] - dataforVitesse[0][1], 2));
            dataforVitesse[1] = last_point;
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
            vitesse_moyenne = (sum / fenetre / 10)*4+1;
            if(vitesse_moyenne > 5) vitesse_moyenne = 5;
        }
        , 30);
    }
    else{
        clearInterval();
        dataforVitesse[1] = [0.5, 0.5, 15];
        vitesse_moyenne = 0;
        mean_v_list = [];
        mean_length = 0;
    }
}*/

function points_distance(x, y, s){
	// Get all the points around the xy input within a chosen distance
	var distances = [0, Math.sqrt(2), Math.sqrt(2), Math.sqrt(8), Math.sqrt(8)];
	var center = 0;
	var points = [];
	if(s == 1 || s == 3){
		center = 0.5;
	}
	for(var x1=0; x1<map_size; x1++){
		for(var y1=0; y1<map_size; y1++){
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
    var new_x = Math.ceil(x*map_size);
    var new_y = Math.ceil(y*-map_size+map_size);
	// new_x = Math.ceil(((x+32)/64)*map_size);
	// new_y = Math.ceil(((y+32)/64)*map_size);
	var xys = points_distance(new_x, new_y, s);
	// Retrieve the data at each point from xys array and add them in the addition array
	for(var j=0; j<xys.length/2; j++){
		for(var index=0; index < rows.length; index++){
			selected_row = rows[index];
			temp_arrayf[index] = all_data[selection][selected_row + '_2D_array'][xys[j*2]][xys[j*2+1]];
			addition[index] = addition[index] + temp_arrayf[index];
		}
	}

	// Measure each mean value for the 3 rows
	for(var e=0; e<addition.length; e++){
		moyenne = addition[e]/(xys.length/2);
		moyenne_array[e] = moyenne;
	}

    // console.log(vitesse_moyenne);

    moyenne_array[1] = (2*moyenne_array[1] - 1)*vitesse_moyenne;
    if(moyenne_array[1] > 1) moyenne_array[1] = 1;
    if(moyenne_array[1] < -1) moyenne_array[1] = -1;
    moyenne_array[1] = (moyenne_array[1] + 1)/2;

    moyenne_array[2] = (2*moyenne_array[2] - 1)*vitesse_moyenne;
    if(moyenne_array[2] > 1) moyenne_array[2] = 1;
    if(moyenne_array[2] < -1) moyenne_array[2] = -1;
    moyenne_array[2] = (moyenne_array[2] + 1)/2;

    stiffness = moyenne_array[1].toFixed(3);
    viscosity = ((Math.sin((moyenne_array[2]*Math.PI)/2) * stiffness) / 0.35).toFixed(3);
    elasticity = (Math.cos((moyenne_array[2]*Math.PI)/2) * stiffness).toFixed(3);

    console.log(stiffness, viscosity, elasticity);

    io.emit('stiffness', viscosity);

}

async function init(){
    for(var cell=0; cell<cells.length; cell++){
        // Read the csv file from the path in argument
        const filePath = path.join(__dirname + '/data/', cells[cell] + '.csv');
        await readCSV(filePath, cell).then((data) => {
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
                if(data[j]['E0Tn'] >= 1){
                    D_dict['E0Tn_array'][j] = parseFloat(Math.log(data[j]['E0Tn']) / Math.log(10));
                }
                else{
                    D_dict['E0Tn_array'][j] = 0;
                }
                D_dict['betaTn_array'][j] = parseFloat(data[j]['betaTn']);
                
            }
    
            // Append the dictionnary to an array containing all the cells data
            all_data.push(JSON.parse(JSON.stringify(D_dict)));
        }).catch((err) => console.error('Error reading CSV:', err));
    }
}

init().then(() => {
    console.log('All CSVs read');
    filter_data();
});


// ========== SOCKET.IO ========== //
/*  This is auto initiated event when Client connects to the server  */
io.on('connection',function(socket){
    // Log into console when a client connects
    console.log(socket.id + ' connected');
    users = socket.client.conn.server.clientsCount;
    console.log(users + " users connected" );

    // Send the users available to the client
    io.to(socket.id).emit('users', users_dict['user_active'], socket.id, cells);

    socket.on('message',function(event){
        if(event.includes('link')){
            // When the client chooses a user, its id is added to the dictionary
            // and the user number is set to unavailable
            users_dict['user_active'][event[0]-1] = 0;
            users_dict['ids'][event[0]-1] = event.substr(event.length-20, 20);
            // Max.outlet(event[0] + ' link');
        }
        else if(event.includes('touch')){
            touch = event.substr(8, 10);
            console.log(touch);
            // calculVitesse(touch);
        }
    });

    socket.on('coordonates', function(event){
        // When the client sends coordinates, it is directed to Max outlet
        // Max.outlet(event);
        x = event[1];
        y = event[2];
        s = Math.ceil(((event[3]-15)/30)*4);
        if(touch == 1 && x != old_x){
            old_x = x;
            last_point = [x, y, s];
            calculVitesse(touch, last_point);
            sort_values(x, y, s);
        }
    });

    // When a client disconnects, its user number is set back to available
    socket.on('disconnect', function(){
        console.log(socket.id + ' disconnected');
        let index = users_dict['ids'].indexOf(socket.id);
        users_dict['user_active'][index] = 1;
        // Max.outlet(index+1 + ' unlink');
    });
});

/*Max.addHandler("unlink", (user) => {
    let num_user = user[4];
    users_dict['user_active'][num_user-1] = 1;
    Max.outlet(num_user + ' unlink');
});

Max.addHandler("users_count", (num) => {
    users_dict['user_active'] = new Array(num).fill(1);
    console.log(users_dict['user_active']);
});*/

port = 8000;
http.listen(port,function(){
    console.log("Listening on" + port);
});
