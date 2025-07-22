class LotterySystem {
  constructor() {
    this.isSpinning = false;
    this.slots = [];
    this.results = [];
    this.spinIntervals = []; // 存储每个槽位的滚动定时器
    this.init();
  }

  init() {
    // 获取所有抽奖槽
    this.slots = [
      document.getElementById('slot1'),
      document.getElementById('slot5'),
      document.getElementById('slot2'),
      document.getElementById('slot3'),
      document.getElementById('slot4')
    ];

    // 获取按钮和结果显示区域
    this.startBtn = document.getElementById('startBtn');
    this.resultDiv = document.getElementById('result');
    this.inventoryGrid = document.getElementById('inventory');

    // 绑定事件 - 支持移动端触摸
    this.startBtn.addEventListener('click', () => this.startLottery());
    this.startBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startLottery();
    }, { passive: false });

    // 移动端优化：防止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // 移动端优化：防止页面滚动
    document.addEventListener('touchmove', (e) => {
      if (e.target.closest('.slot-machine') || e.target.closest('.start-btn')) {
        e.preventDefault();
      }
    }, { passive: false });

    // 初始化结果显示
    this.showResult('点击按钮开始5秒闪动！最后停的奖励即为获得奖励！', 'info');
  }

  startLottery() {
    if (this.isSpinning) return; // 如果正在滚动，忽略点击

    // 重置装备栏
    this.resetInventory();

    // 开始滚动
    this.isSpinning = true;
    this.startBtn.textContent = '🎯 装备中... 🎯';
    this.results = [];

    // 清除之前的结果
    this.clearResults();
    this.showResult('装备随机中...', 'info');

    // 为每个槽位设置5秒后停止
    const stopTime = 5000;

    this.slots.forEach((slot, index) => {
      this.spinSlot(slot, index, stopTime);
    });

    // 5秒后自动停止所有槽位
    setTimeout(() => {
      this.stopAllSpinning();
    }, stopTime);
  }

  spinSlot(slot, slotIndex, stopTime) {
    const items = slot.querySelectorAll('.slot-item');
    const itemCount = items.length;
    let currentIndex = 0;
    let speed = 100; // 闪动速度
    let isSpinning = true;
    let startTime = Date.now();

    // 随机打乱物品顺序（奖励本身不变，只是顺序随机）
    this.shuffleItems(slot);

    // 移除spinning类，不再使用滑动动画

    const flash = () => {
      if (!isSpinning) return;

      // 隐藏所有物品
      items.forEach(item => {
        item.style.opacity = '0';
        item.classList.remove('selected', 'winner', 'center-position');
      });

      // 显示当前物品（确保在中心位置）
      const currentItem = items[currentIndex];
      currentItem.style.opacity = '1';
      currentItem.classList.add('selected');

      // 更新索引
      currentIndex = (currentIndex + 1) % itemCount;

      // 计算已经过去的时间
      const elapsedTime = Date.now() - startTime;
      const remainingTime = stopTime - elapsedTime;

      // 逐渐减速：在最后2秒内逐渐变慢
      if (remainingTime < 2000) {
        const slowDownFactor = (2000 - remainingTime) / 2000; // 0到1之间的值
        speed = 100 + (slowDownFactor * 300); // 从100ms逐渐增加到400ms
      }

      // 继续闪动或停止
      if (elapsedTime < stopTime && isSpinning) {
        const intervalId = setTimeout(flash, speed);
        this.spinIntervals[slotIndex] = { intervalId, stop: () => { isSpinning = false; } };
      } else {
        this.stopSlot(slot, slotIndex, currentIndex);
      }
    };

    flash();
  }

  stopSlot(slot, slotIndex, finalIndex) {
    const items = slot.querySelectorAll('.slot-item');

    // 隐藏所有物品
    items.forEach(item => {
      item.style.opacity = '0';
      item.classList.remove('selected', 'winner', 'center-position');
    });

    // 获取当前显示的物品（最后停的奖励）
    const currentItem = items[finalIndex];

    // 显示并高亮最终物品（确保在中心位置）
    currentItem.style.opacity = '1';
    currentItem.classList.add('selected', 'center-position');

    // 获取当前物品的奖品名称（这是最终获得的奖励）
    const prizeName = currentItem.querySelector('img').alt;
    this.results[slotIndex] = prizeName;

    // 输出调试信息
    console.log(`槽位${slotIndex + 1}获得奖励: ${prizeName}`);
  }

  showFinalResults() {
    const resultText = `获得奖励：${this.results.join(' + ')}`;
    this.showResult(resultText, 'success');

    // 将获得的装备添加到装备栏
    this.addToInventory(this.results);

    // 播放音效（如果有的话）
    this.playSound();
  }

  showResult(message, type) {
    this.resultDiv.textContent = message;
    this.resultDiv.className = `result ${type}`;
  }

  shuffleItems(slot) {
    const items = Array.from(slot.querySelectorAll('.slot-item'));

    // Fisher-Yates 洗牌算法 - 只打乱顺序，奖励本身不变
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // 交换DOM元素位置
      const temp = items[i];
      items[i] = items[j];
      items[j] = temp;
    }

    // 重新排列DOM元素，保持奖励内容不变
    items.forEach(item => {
      slot.appendChild(item);
    });

    // 验证：确保所有奖励仍然存在（调试用）
    const itemNames = items.map(item => item.querySelector('img').alt);
    console.log(`槽位物品顺序: ${itemNames.join(', ')}`);
  }

  // 移除moveToCenter方法，因为我们不再需要移动物品
  // 直接使用getCenterItem获取与线条重合的物品

  getCenterItem(slot) {
    // 由于现在只显示一个物品，直接返回当前可见的物品
    const items = Array.from(slot.querySelectorAll('.slot-item'));
    const slotMachine = slot.parentElement;
    const slotMachineRect = slotMachine.getBoundingClientRect();
    const centerX = slotMachineRect.left + slotMachineRect.width / 2;

    // 找到当前在中心位置的物品
    let centerItem = items[0];
    let minDistance = Infinity;

    items.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.left + itemRect.width / 2;
      const distance = Math.abs(itemCenter - centerX);

      if (distance < minDistance) {
        minDistance = distance;
        centerItem = item;
      }
    });

    return centerItem;
  }

  ensurePerfectAlignment(slot, targetItem) {
    // 获取目标物品的实际位置
    const targetRect = targetItem.getBoundingClientRect();
    const slotMachine = slot.parentElement;
    const slotMachineRect = slotMachine.getBoundingClientRect();

    // 计算目标物品中心与指示器中心的偏差
    const targetCenter = targetRect.left + targetRect.width / 2;
    const indicatorCenter = slotMachineRect.left + slotMachineRect.width / 2;
    const offset = targetCenter - indicatorCenter;

    // 如果偏差超过2px，进行微调
    if (Math.abs(offset) > 2) {
      const currentTransform = slot.style.transform || 'translateX(0px)';
      const currentX = parseFloat(currentTransform.match(/translateX\(([^)]+)px\)/)?.[1] || 0);
      const newX = currentX - offset;

      slot.style.transform = `translateX(${newX}px)`;
    }
  }

  resetInventory() {
    // 清空装备栏
    this.inventoryGrid.innerHTML = '';
  }

  stopAllSpinning() {
    // 停止所有槽位的滚动
    this.spinIntervals.forEach((intervalData, index) => {
      if (intervalData) {
        clearTimeout(intervalData.intervalId);
        intervalData.stop();

        // 获取当前选中的项
        const slot = this.slots[index];
        const items = slot.querySelectorAll('.slot-item');
        const selectedItem = slot.querySelector('.slot-item.selected');
        const currentIndex = Array.from(items).indexOf(selectedItem);

        // 停止该槽位
        this.stopSlot(slot, index, currentIndex);
      }
    });

    // 清空定时器数组
    this.spinIntervals = [];

    // 显示结果
    this.showFinalResults();
    this.isSpinning = false;
    this.startBtn.textContent = '🎯 随机装备 🎯';
  }

  clearResults() {
    this.slots.forEach(slot => {
      const items = slot.querySelectorAll('.slot-item');
      items.forEach(item => {
        item.classList.remove('selected', 'winner', 'center-position');
        item.style.opacity = '0'; // 初始状态隐藏所有物品
      });
      // 显示第一个物品作为初始状态
      if (items.length > 0) {
        items[0].style.opacity = '1';
      }
    });
  }

  addToInventory(items) {
    items.forEach(itemName => {
      // 创建装备项
      const inventoryItem = document.createElement('div');
      inventoryItem.className = 'inventory-item';

      // 获取对应的图片URL
      const imgUrl = this.getItemImageUrl(itemName);

      // 获取当前时间
      const now = new Date();
      const timeString = now.toLocaleString('zh-CN');

      inventoryItem.innerHTML = `
                <img src="${imgUrl}" alt="${itemName}">
                <div class="item-name">${itemName}</div>
                <div class="item-time">${timeString}</div>
            `;

      // 添加到装备栏
      this.inventoryGrid.appendChild(inventoryItem);
    });
  }

  getItemImageUrl(itemName) {
    // 根据物品名称返回对应的图片URL
    const itemImages = {
      // 地图
      '绝密航天': 'map/1.jpg',
      '机密航天': 'map/2.jpg',
      '绝密监狱': 'map/3.jpg',
      '绝密巴克什': 'map/4.jpg',
      '机密巴克什': 'map/5.jpg',
      '机密长弓': 'map/6.jpg',
      '机密大坝': 'map/7.jpg',
      // 枪械
      'AKM突击步枪': 'gang/AKM突击步枪.jpg',
      'M4A1突击步枪': 'gang/M4A1突击步枪.jpg',
      'K416突击步枪': 'gang/K416突击步枪.jpg',
      'QBZ95-1突击步枪': 'gang/QBZ95-1突击步枪.jpg',
      'AKS-74U突击步枪': 'gang/AKS-74U突击步枪.jpg',
      'ASh-12战斗步枪': 'gang/ASh-12战斗步枪.jpg',
      'M16A4突击步枪': 'gang/M16A4突击步枪.jpg',
      'AUG突击步枪': 'gang/AUG突击步枪.jpg',
      'M7战斗步枪': 'gang/M7战斗步枪.jpg',
      'SG552突击步枪': 'gang/SG552突击步枪.jpg',
      'AK-12突击步枪': 'gang/AK-12突击步枪.jpg',
      'SCAR-H突击步枪': 'gang/SCAR-H突击步枪.jpg',
      'G3战斗步枪': 'gang/G3战斗步枪.jpg',
      'PTR-32突击步枪': 'gang/PTR-32突击步枪.jpg',
      'CAR-15突击步枪': 'gang/CAR-15突击步枪.jpg',
      'AS Val突击步枪': 'gang/AS Val突击步枪.jpg',
      '腾龙突击步枪': 'gang/腾龙突击步枪.jpg',
      'K437突击步枪': 'gang/K437突击步枪.jpg',
      'KC17突击步枪': 'gang/KC17突击步枪.jpg',
      'P90冲锋枪': 'gang/P90冲锋枪.jpg',
      'MP5冲锋枪': 'gang/MP5冲锋枪.jpg',
      'UZI冲锋枪': 'gang/UZI冲锋枪.jpg',
      'Vector冲锋枪': 'gang/Vector冲锋枪.jpg',
      '野牛冲锋枪': 'gang/野牛冲锋枪.jpg',
      'SMG-45冲锋枪': 'gang/SMG-45冲锋枪.jpg',
      'SR-3M紧凑突击步枪': 'gang/SR-3M紧凑突击步枪.jpg',
      '勇士冲锋枪': 'gang/勇士冲锋枪.jpg',
      'MP7冲锋枪': 'gang/MP7冲锋枪.jpg',
      'QCQ171冲锋枪': 'gang/QCQ171冲锋枪.jpg',
      'M1014霰弹枪': 'gang/M1014霰弹枪.jpg',
      'S12K霰弹枪': 'gang/S12K霰弹枪.jpg',
      'M870霰弹枪': 'gang/M870霰弹枪.jpg',
      '725双管霰弹枪': 'gang/725双管霰弹枪.jpg',
      'PKM通用机枪': 'gang/PKM通用机枪.jpg',
      'M249轻机枪': 'gang/M249轻机枪.jpg',
      'M250通用机枪': 'gang/M250通用机枪.jpg',
      'QJB201轻机枪': 'gang/QJB201轻机枪.jpg',
      'Mini-14射手步枪': 'gang/Mini-14射手步枪.jpg',
      'VSS射手步枪': 'gang/VSS射手步枪.jpg',
      'SVD狙击步枪': 'gang/SVD狙击步枪.jpg',
      'M14射手步枪': 'gang/M14射手步枪.jpg',
      'SKS射手步枪': 'gang/SKS射手步枪.jpg',
      'SR-25射手步枪': 'gang/SR-25射手步枪.jpg',
      'SR9射手步枪': 'gang/SR9射手步枪.jpg',
      'PSG-1射手步枪': 'gang/PSG-1射手步枪.jpg',
      'SV-98狙击步枪': 'gang/SV-98狙击步枪.jpg',
      'M700狙击步枪': 'gang/M700狙击步枪.jpg',
      'R93狙击步枪': 'gang/R93狙击步枪.jpg',
      'AWM狙击步枪': 'gang/AWM狙击步枪.jpg',
      '沙漠之鹰': 'gang/沙漠之鹰.jpg',
      'QSZ92G': 'gang/QSZ92G.jpg',
      '357左轮': 'gang/357左轮.jpg',
      'G17': 'gang/G17.jpg',
      'G18': 'gang/G18.jpg',
      '93R': 'gang/93R.jpg',
      'M1911': 'gang/M1911.jpg',
      '复合弓': 'gang/复合弓.jpg',
      // 人物
      '疾风': 'character/疾风.jpg',
      '无名': 'character/无名.jpg',
      '牧羊人': 'character/牧羊人.jpg',
      '露娜': 'character/露娜.jpg',
      '蛊': 'character/蛊.jpg',
      '乌鲁鲁': 'character/乌鲁鲁.jpg',
      '威龙': 'character/威龙.jpg',
      '深蓝': 'character/深蓝.jpg',
      '红狼': 'character/红狼.jpg',
      '蜂医': 'character/蜂医.jpg',
      '麦晓雯': 'character/麦晓雯.jpg',
      // 头盔
      '老式钢盔': 'head/老式钢盔.jpg',
      '安保头盔': 'head/安保头盔.jpg',
      '奔尼帽': 'head/奔尼帽.jpg',
      '户外棒球帽': 'head/户外棒球帽.jpg',
      'DRO战术头盔': 'head/DRO战术头盔.jpg',
      'H01战术头盔': 'head/H01战术头盔.jpg',
      '复古摩托头盔': 'head/复古摩托头盔.jpg',
      'H07战术头盔': 'head/H07战术头盔.jpg',
      'MC防弹头盔': 'head/MC防弹头盔.jpg',
      '防暴头盔': 'head/防暴头盔.jpg',
      'DAS防弹头盔': 'head/DAS防弹头盔.jpg',
      'MC201防弹头盔': 'head/MC201防弹头盔.jpg',
      'D6战术头盔': 'head/D6战术头盔.jpg',
      'MHS战术头盔': 'head/MHS战术头盔.jpg',
      'DICH训练头盔': 'head/DICH训练头盔.jpg',
      'GT1战术头盔': 'head/GT1战术头盔.jpg',
      'GN久战重型夜视头盔': 'head/GN久战重型夜视头盔.jpg',
      'Mask-1铁壁头盔': 'head/Mask-1铁壁头盔.jpg',
      'H09防爆头盔': 'head/H09防爆头盔.jpg',
      'DICH-1战术头盔': 'head/DICH-1战术头盔.jpg',
      'GN重型头盔': 'head/GN重型头盔.jpg',
      'GN重型夜视头盔': 'head/GN重型夜视头盔.jpg',
      '任意六级头': 'head/任意六级头.jpg',
      // 护甲
      '摩托马甲': 'body/摩托马甲.jpg',
      '安保防弹衣': 'body/安保防弹衣.jpg',
      '尼龙防弹衣': 'body/尼龙防弹衣.jpg',
      '轻型防弹衣': 'body/轻型防弹衣.jpg',
      '简易防刺服': 'body/简易防刺服.jpg',
      'HT战术背心': 'body/HT战术背心.jpg',
      'TG战术防弹衣': 'body/TG战术防弹衣.jpg',
      '通用战术背心': 'body/通用战术背心.jpg',
      '制式防弹背心': 'body/制式防弹背心.jpg',
      'Hvk快拆防弹衣': 'body/Hvk快拆防弹衣.jpg',
      'TG-H防弹衣': 'body/TG-H防弹衣.jpg',
      'HMP特勤防弹衣': 'body/HMP特勤防弹衣.jpg',
      '射手战术背心': 'body/射手战术背心.jpg',
      '武士防弹背心': 'body/武士防弹背心.jpg',
      '突击手防弹背心': 'body/突击手防弹背心.jpg',
      'DT-AVS防弹衣': 'body/DT-AVS防弹衣.jpg',
      '精英防弹背心': 'body/精英防弹背心.jpg',
      'MK-2战术背心': 'body/MK-2战术背心.jpg',
      'Hvk-2防弹衣': 'body/Hvk-2防弹衣.jpg',
      'FS复合防弹衣': 'body/FS复合防弹衣.jpg',
      '重型突击背心': 'body/重型突击背心.jpg',
      '任意六甲': 'body/任意六甲.jpg'
    };

    return itemImages[itemName] || 'https://via.placeholder.com/60x60/CCCCCC/FFFFFF?text=未知';
  }

  playSound() {
    // 创建简单的音效（使用Web Audio API）
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('音效播放失败:', error);
    }
  }
}

// 添加一些额外的视觉效果
class VisualEffects {
  constructor() {
    this.initParticles();
  }

  initParticles() {
    // 创建粒子效果
    const particleContainer = document.createElement('div');
    particleContainer.className = 'particle-container';
    particleContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;
    document.body.appendChild(particleContainer);

    // 定期创建粒子
    setInterval(() => {
      this.createParticle(particleContainer);
    }, 2000);
  }

  createParticle(container) {
    const particle = document.createElement('div');
    particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            border-radius: 50%;
            pointer-events: none;
            animation: float 3s ease-in-out infinite;
        `;

    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';

    container.appendChild(particle);

    // 3秒后移除粒子
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, 3000);
  }
}

// 添加浮动动画的CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes float {
        0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0;
        }
        50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new LotterySystem();
  new VisualEffects();

  // 初始化音频控制
  initAudioControl();
});

// 音频控制功能
function initAudioControl() {
  const audioBtn = document.getElementById('audioBtn');
  const volumeBtn = document.getElementById('volumeBtn');
  const bgMusic = document.getElementById('bgMusic');
  const audioIcon = audioBtn.querySelector('.audio-icon');
  const volumeIcon = volumeBtn.querySelector('.volume-icon');
  const audioStatus = document.querySelector('.audio-status');

  // 音频状态管理
  let isMuted = false;
  let currentVolume = 0.3;

  // 设置初始音量
  bgMusic.volume = currentVolume;

  // 更新状态显示
  function updateStatus(message) {
    if (audioStatus) {
      audioStatus.textContent = message;
    }
  }

  // 更新音量图标
  function updateVolumeIcon() {
    if (isMuted || bgMusic.volume === 0) {
      volumeIcon.textContent = '🔇';
    } else if (bgMusic.volume < 0.3) {
      volumeIcon.textContent = '🔉';
    } else if (bgMusic.volume < 0.7) {
      volumeIcon.textContent = '🔊';
    } else {
      volumeIcon.textContent = '🔊';
    }
  }

  // 添加音频加载事件监听
  bgMusic.addEventListener('loadeddata', () => {
    console.log('背景音乐加载成功');
    updateStatus('手动播放音乐');
    updateVolumeIcon();
  });

  bgMusic.addEventListener('error', (e) => {
    console.error('背景音乐加载失败:', e);
    audioIcon.textContent = '❌';
    updateStatus('音乐加载失败');
  });

  // 播放/暂停按钮 - 支持移动端触摸
  const handleAudioClick = () => {
    console.log('音频按钮被点击');

    if (bgMusic.paused) {
      // 尝试播放音乐
      const playPromise = bgMusic.play();

      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('音乐开始播放');
          audioIcon.textContent = '🔊';
          audioBtn.classList.remove('muted');
          updateStatus('音乐播放中');
        }).catch((error) => {
          console.error('播放失败:', error);
          audioIcon.textContent = '❌';
          updateStatus('播放失败，请重试');
        });
      }
    } else {
      bgMusic.pause();
      console.log('音乐暂停');
      audioIcon.textContent = '🔇';
      audioBtn.classList.add('muted');
      updateStatus('音乐已暂停');
    }
  };

  audioBtn.addEventListener('click', handleAudioClick);
  audioBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleAudioClick();
  }, { passive: false });

  // 音量控制按钮 - 支持移动端触摸
  const handleVolumeClick = () => {
    if (isMuted) {
      // 取消静音
      bgMusic.volume = currentVolume;
      isMuted = false;
      updateStatus(`音量: ${Math.round(currentVolume * 100)}%`);
    } else {
      // 静音
      currentVolume = bgMusic.volume;
      bgMusic.volume = 0;
      isMuted = true;
      updateStatus('已静音');
    }
    updateVolumeIcon();
  };

  volumeBtn.addEventListener('click', handleVolumeClick);
  volumeBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleVolumeClick();
  }, { passive: false });

  // 音量调节（鼠标滚轮）
  volumeBtn.addEventListener('wheel', (e) => {
    e.preventDefault();

    if (isMuted) {
      isMuted = false;
    }

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    currentVolume = Math.max(0, Math.min(1, bgMusic.volume + delta));
    bgMusic.volume = currentVolume;

    updateVolumeIcon();
    updateStatus(`音量: ${Math.round(currentVolume * 100)}%`);
  });

  // 添加键盘快捷键控制音乐
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      audioBtn.click();
    }
    if (e.code === 'KeyV' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      volumeBtn.click();
    }
  });

  // 测试音频功能
  setTimeout(() => {
    if (bgMusic.readyState >= 2) {
      console.log('音频文件已加载完成');
      updateStatus('手动播放音乐');
    } else {
      console.log('音频文件正在加载...');
      updateStatus('音乐加载中...');
    }
  }, 1000);

  // 初始化音频上下文（解决某些浏览器的自动播放限制）
  function initAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();

      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      console.log('音频上下文已初始化');
    } catch (error) {
      console.log('音频上下文初始化失败:', error);
    }
  }

  // 在用户点击音频按钮时初始化音频上下文
  audioBtn.addEventListener('click', initAudioContext, { once: true });
}

// 添加键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
      startBtn.click();
    }
  }
});

// 移动端优化：防止意外触发
// 移除滑动手势功能，只保留按钮点击，避免误触

// 防止双击缩放
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = (new Date()).getTime();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// 防止在特定区域的意外滚动
document.addEventListener('touchmove', (e) => {
  // 只在抽奖区域和按钮区域阻止默认滚动
  if (e.target.closest('.slot-machine') ||
    e.target.closest('.start-btn') ||
    e.target.closest('.control-section')) {
    e.preventDefault();
  }
}, { passive: false });