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
        var sortedGames = Object.values(games).sort((a, b)=>a.timestamp > b.timestamp)
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

// main ranking function,
function rank(players, games){
    function adjust(ps, game){
        var winners = game.winner === 'l'? game.playersL : game.playersR
        var losers = game.winner === 'r'? game.playersL : game.playersR
        var allParticipants = [...winners, ...losers]
        var winners = ps
            .filter(p=>winners.includes(p.id))
            .map(p=>({rank: 1, id:p.id, skill:p.skill}))
        var losers = ps
            .filter(p=>losers.includes(p.id))
            .map(p=>({rank: 2, id:p.id, skill:p.skill}))
        var toAdjust = [...winners, ...losers]
        trueskill.AdjustPlayers(toAdjust)
        return ps.map(p=>({
            id: p.id,
            skill: allParticipants.includes(p.id)?
                toAdjust.filter(o=>o.id===p.id)[0].skill : p.skill
        }))
    }
    // initial player values
    var ps = players.map(player=>({id: player, skill: [25.0, 25.0/3.0]}))
    // update skill for each game
    games.forEach(game=>{ps = adjust(ps, game)})
    // set points, sort and return
    ps = ps.map(p=>({id: p.id, points: p.skill[0] - 3 * p.skill[1]}))
    return ps.sort((a, b)=>a.points < b.points).map(p=>[p.id, p.points])
}

// UI components
playerButtonL = player=>m('.button.float-right', {onclick: _=>removePlayerFromGameBeingAdded(player)}, player)
playerButtonR = player=>m('.button', {onclick: _=>removePlayerFromGameBeingAdded(player)}, player)

// view derived from state
var View = ()=>m('.container',
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
            m('', 'Players are ranked client-side with ', m('a[href=https://github.com/freethenation/node-trueskill]', 'TrueSkill')),
            m('h2', 'Leaderboard'),
            rank(state.players, state.games).map(([player, skill], i)=>m('.row',
                m('.column.column-40',
                    m('h5', `${i}. ${player}`)),
                m('.column.column-20',
                    m('small', `${skill.toFixed(0)} points`)),
                state.gameBeingAdded?
                    m('.column',
                        m('.button.button-small', {onclick: _=>addPlayerToL(player)}, 'Add Left'),
                        m('.button.button-small.button-outline', {onclick: _=>addPlayerToR(player)}, 'Add Right'))
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
