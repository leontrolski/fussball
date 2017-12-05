var root = document.getElementById('root')
var firebase = 'https://footy-8a5f7.firebaseio.com'

// state var
var state = {players: [], playerBeingAdded: '', games: [], gameBeingAdded: null}

// functions that mutate `state`
function setEmptyGame(){
    state.gameBeingAdded = {playersL: [], playersR: [], timestamp: Date.now()}
}
function win(lOrR){
    thereAreSomePlayers = state.gameBeingAdded.playersL.length > 0
    teamsAreEqual = state.gameBeingAdded.playersL.length === state.gameBeingAdded.playersR.length
    if (thereAreSomePlayers && teamsAreEqual){
        state.gameBeingAdded.winner = lOrR
        state.games.push(state.gameBeingAdded)
        postGame()
        state.gameBeingAdded = null
    }
}
function winL(){
    win('l')
}
function winR(){
    win('r')
}
function addPlayer(){
    if(state.playerBeingAdded && !state.players.includes(state.playerBeingAdded)){
        state.players.push(state.playerBeingAdded)
        postPlayer()
        state.playerBeingAdded = ''
    }
}
function removePlayerFromGameBeingAdded(player){
    state.gameBeingAdded.playersL = state.gameBeingAdded.playersL.filter(p=>p !== player)
    state.gameBeingAdded.playersR = state.gameBeingAdded.playersR.filter(p=>p !== player)
}
function addPlayerTo(player, playersLOrR){
    var both = [...state.gameBeingAdded.playersL, ...state.gameBeingAdded.playersR]
    if(!both.includes(player) && playersLOrR.length < 2){
        playersLOrR.push(player)
    }
}
function addPlayerToL(player){
    addPlayerTo(player, state.gameBeingAdded.playersL)
}
function addPlayerToR(player){
    addPlayerTo(player, state.gameBeingAdded.playersR)
}
// functions that GET/POST from firebase and mutate state
function postGame(){
    var gameBeingAdded = JSON.parse(JSON.stringify(state.gameBeingAdded))  // clone
    gameBeingAdded.timestamp = {'.sv': 'timestamp'}  // add server timestamp
    fetch(`${firebase}/game.json`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(gameBeingAdded)
    })
}
function getGames(){
    fetch(`${firebase}/game.json`)
    .then(res=>res.json())
    .then(games=>{
        var sortedGames = Object.values(games).sort((a, b)=>a.timestamp - b.timestamp)
        state.games = sortedGames
        m.redraw()
    })
}
function postPlayer(){
    fetch(`${firebase}/player.json`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(state.playerBeingAdded)
    })
}
function getPlayers(){
    fetch(`${firebase}/player.json`)
    .then(res=>res.json())
    .then(players=>{
        state.players = Object.values(players)
        m.redraw()
    })
}
function getAll(){
    getGames()
    getPlayers()
}

// main ranking function
function adjust(ps, game){
    var [rankL, rankR] = game.winner === 'l'? [1, 2] : [2, 1];
    var teamL = ps.filter(p=>game.playersL.includes(p.id));
    var teamR = ps.filter(p=>game.playersR.includes(p.id));
    var otherPlayers = ps.filter(
        p=>!game.playersL.includes(p.id) && !game.playersR.includes(p.id));
    var newRatings = trueSkill.calculateNewRatings(teamL, teamR, rankL, rankR);
    return [...newRatings, ...otherPlayers]
}
function adjustAddPointsSort(){
    // fill in
}
function getRanked(){ 
    // initial player values
    var ps = state.players.map(player=>({id: player, mean: 25.0, stdev: 25.0/3.0}))
    // update skill for each game and reduce
    var [final, accumulated] = R.mapAccum((ps, games)=>R.repeat(adjust(ps, games), 2), ps, state.games)
    // set points, sort and return
    var withPoints = final.map(p=>R.merge(p, {points: p.mean - 3 * p.stdev}))
    var sorted = R.sort((a, b)=>b.points - a.points, withPoints)
    return sorted
}

// UI components
var playerButtonL = player=>m('.button.float-right', {onclick: _=>removePlayerFromGameBeingAdded(player)}, player)
var playerButtonR = player=>m('.button', {onclick: _=>removePlayerFromGameBeingAdded(player)}, player)
var winBlock = m('span.green[title=win]', '▀')
var loseBlock = m('span.red[title=lose]', '▄')
var blocks = player=>state.games
    .filter(game=>game.playersL.includes(player) || game.playersR.includes(player))
    .slice(-5)
    .map(game=>(game.playersL.includes(player)? 'l': 'r') === game.winner)
    .map(won=>won? winBlock: loseBlock)


var someNum = 4

// view derived from state
var View = ()=>m('.container', 
    // m('svg[width=400][height=200][xmlns=http://www.w3.org/2000/svg]',
    //     m('style', 'line, rect{stroke:#000;fill:#fff;}'),
    //     m('line', {x1:20, x2:120, y1:parseFloat(someNum) * 10, y2: 130}),
    //     m('line', {x1:- parseFloat(someNum) * 5, x2:120, y1:0, y2: parseFloat(someNum) * 2})),
    // m('input[type=number]', {value: someNum, oninput: m.withAttr('value', v=>someNum=v)}))
    m('.row', m('h1', 'Fußball')),
    !state.gameBeingAdded?
        m('.row', m('.button', {onclick: setEmptyGame}, 'Add game'))
        :[m('.row',
            m('em', 'Click ', m('b', 'Add Left, Add Right'), ' below to populate, click name to remove')),
        m('br'),
        m('.row',
            m('.column.column-60',
                m('.row',
                    m('.column.column-35', state.gameBeingAdded.playersL.map(playerButtonL)),
                    m('.column.column-10.center', 'VS'),
                    m('.column.column-35', state.gameBeingAdded.playersR.map(playerButtonR)))),
            m('.column',
                m('span', '⇻',
                m('.button', {onclick: winL}, 'Left won!'),
                m('.button.button-outline', {onclick: winR}, 'Right won!'))))],
    m('hr'),
    m('.row',
        m('.column',
            m('', 'Players are ranked client-side with ', m('a[href=https://www.microsoft.com/en-us/research/publication/trueskilltm-a-bayesian-skill-rating-system/]', 'TrueSkill')),
            m('h2', 'Leaderboard'),
            getRanked().map((p, i)=>m('.row',
                m('.column.column-30',
                    m('h5', `${i}. ${p.id}`)),
                m('.column.column-15',
                    m('small', blocks(p.id))),
                m('.column.column-15',
                    m('small', ` ${p.points.toFixed(0)} points`)),
                state.gameBeingAdded?
                    m('.column',
                        m('.button.button-small', {onclick: _=>addPlayerToL(p.id)}, 'Add Left'),
                        m('.button.button-small.button-outline', {onclick: _=>addPlayerToR(p.id)}, 'Add Right'))
                    :null)),
                m('.row',
                    m('.column.column-60',
                        m('input[type=text]', {value: state.playerBeingAdded, oninput: m.withAttr('value', v=>state.playerBeingAdded=v)})),
                    m('.column',
                        m('.button', {onclick: addPlayer}, 'Add player')))),
        m('.column',
            m('h2', 'Games ', m('em', `(${state.games.length})`)),
            m('table', m('tbody',
            [...state.games].reverse().map(game=>m('tr',
                m('td', (new Date(game.timestamp)).toLocaleDateString()),
                m('td', {class: game.winner === 'l'? 'bold': ''}, game.playersL.join(', ')),
                m('td', {class: game.winner === 'r'? 'bold': ''}, game.playersR.join(', ')))))))),
)

m.mount(root, {view: View})
getAll()
