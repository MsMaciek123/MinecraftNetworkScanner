// Requires mcstatus, nmap and node 16.x to be installed!
// Configuration
let domains = ['node1.hosting.com']
let portRange = '0-65535';
const { execSync } = require("child_process");

let totalRunningServers = 0;
let totalOpenedPorts = 0;

for(let domainID=0; domainID<domains.length; domainID++)
{
	console.log(`Scanning ports for ${domains[domainID]} (${portRange})`)
	let out = execSync(`nmap ${domains[domainID]} -p ${portRange}`);
	let ports = returnPorts(out.toString())
	let sign = ': '
	if(ports.length == 0) sign = ''
	console.log(`${domains[domainID]} has ${ports.length} opened port(s)${sign}${formatPortList(ports)}`)
	totalOpenedPorts += ports.length;
	
	for(let portID=0; portID<ports.length; portID++)
	{
		let IP = domains[domainID]
		let port = ports[portID].port
		
		let serverStatus = pingServer(IP, parseInt(port))
		if(serverStatus == null)
			console.log(`[-] Minecraft server at ${IP}:${port} is not active!`)
		else
		{
			console.log(`[+] Minecraft server at ${IP}:${port} is running ${serverStatus.version} with ${serverStatus.players} players`) // , MOTD:\n${serverStatus.motd}
			totalRunningServers += 1;
		}
	}
}

console.log(`In total ${totalRunningServers} active minecraft servers`)
console.log(`In total ${totalOpenedPorts} opened ports`)

// Returns nicely formatted port list
function formatPortList(portList)
{
	let output = '';
	for(let portID=0; portID<portList.length; portID++)
	{
		output += portList[portID].port + ', '
	}
	return output.slice(0, output.length-2)
}

// Returns array with ports and its states
// [ {'port': 25565, 'state': 'open'}, {'port': 25566, 'state': 'closed'} ]
function returnPorts(data)
{
	data = data.split('\n')
	let portsPrev = data.slice(5, data.length-3)
	let ports = [] // {'port': 25565, 'state': 'open'}
	for(let iPorts=0; iPorts<portsPrev.length; iPorts++)
	{
		let currentPortData = portsPrev[iPorts] // [port, state]
		currentPortData = currentPortData.split(' ') // split it
		currentPortData = currentPortData.slice(0, currentPortData.length-1) // remove service info
		currentPortData[0] = currentPortData[0].split('/')[0] // remove /tcp from port info
		
		// additional check
		let parsedPortInt = parseInt(currentPortData[0])
		if(!(parsedPortInt >= 0 && parsedPortInt <= 65535)) continue
		
		ports.push({'port': currentPortData[0], 'state': currentPortData[1]})
	}
	
	return ports
}

// Returns null if server is offline
// or {'version': 'unknown', 'motd': '', 'players': 'unknown/unknown'} if server is online
function pingServer(ip, port)
{
	let data = {'version': 'unknown', 'motd': '', 'players': 'unknown/unknown'}
	let out = ''
	
	try { out = execSync(`mcstatus ${ip}:${port} status 2>/dev/null`); } // 2>/dev/null removes error message
	catch(e) { return null } // return null if server is offline
	
	out = out.toString().split('\n')
	
	for(let lineID=0; lineID<out.length-1; lineID++)
	{
		if(out[lineID].startsWith('version: ')) // listen for version
			data.version = out[lineID].substring('version: '.length)
		
		if(out[lineID].startsWith('description: ')) // listen for motd
		{
			data.motd = out[lineID].substring('description: '.length)
			if(lineID+1 < out.length && (!out[lineID+1].startsWith('players: '))) // motd can be 2 lines
				data.motd += '\n' + out[lineID+1]
		}
		
		if(out[lineID].startsWith('players: ')) // listen for players
			data.players = out[lineID].split(' ')[1]
	}
	
	return data
}
