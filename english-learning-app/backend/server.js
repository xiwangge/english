// server.js (简化伪代码)
const io = require('socket.io')(httpServer);

let matchQueue = [];
const ROOM_SIZE = 2; // 2人对战

io.on('connection', (socket) => {
  console.log('玩家连接:', socket.id);

  // 1. 处理匹配请求
  socket.on('start-match', () => {
    matchQueue.push(socket);
    if (matchQueue.length >= ROOM_SIZE) {
      const players = matchQueue.splice(0, ROOM_SIZE);
      const roomId = `room-${Date.now()}`;
      
      // 创建房间数据结构
      const room = {
        id: roomId,
        players: players.map(p => ({ id: p.id, strategy: null, progress: 0 })),
        currentRound: 0,
        // ... 其他游戏状态
      };
      // 保存 room 数据...

      players.forEach(p => {
        p.join(roomId);
        p.emit('match-success', { myId: p.id, roomId });
      });
    }
  });

  // 2. 处理策略提交
  socket.on('submit-strategy', (data) => {
    // 找到玩家所在的房间，保存其策略
    // 检查是否所有玩家都提交了策略
    // 如果是，开始第一局：
    // io.to(roomId).emit('round-start', { round: 1, horseAssignments: [...] });
    // 开始游戏循环...
  });

  // 3. 游戏主循环 (后端驱动)
  // 使用 setInterval 或 setTimeout
  function startGameLoop(roomId) {
    const room = getRoom(roomId);
    const raceDuration = 40000; // 40秒
    const tickRate = 500; // 每500ms更新一次位置
    let raceTime = 0;

    const loop = setInterval(() => {
      raceTime += tickRate;
      
      // 3.1 计算新位置
      room.players.forEach(player => {
        // 根据马匹基础速度 + 扑克牌加成 计算当前帧的位移
        const speed = getBaseSpeed(player.currentHorseType) + player.speedBonus;
        player.progress += speed * (tickRate / raceDuration) * 100;
        // 限制在 100%
        if (player.progress > 100) player.progress = 100;
      });

      // 3.2 广播位置更新
      io.to(roomId).emit('update-positions', {
        positions: room.players.map(p => ({ playerId: p.id, progress: p.progress }))
      });

      // 3.3 检查是否到达补给点 (例如 25%, 50%, 75%)
      // 如果到达，暂停循环，给特定玩家发牌，等待出牌，再恢复循环

      // 3.4 检查是否结束
      if (raceTime >= raceDuration || room.players.every(p => p.progress >= 100)) {
        clearInterval(loop);
        // 结算本局，准备下一局或结束游戏
      }
    }, tickRate);
  }

  // ... 处理出牌逻辑，计算加成等
});