// Глобальные переменные
let gameState = {
    character: null,
    isAdventuring: false,
    adventureInterval: null,
    monsters: [],
    combatLog: []
};

// Конфигурация игры
const CONFIG = {
    baseHP: 100,
    baseAttributes: { strength: 10, agility: 10, intelligence: 10 },
    expPerLevel: 100,
    expMultiplier: 1.2,
    adventureInterval: 3000, // 3 секунды между событиями
    monsterEncounterChance: 0.3 // 30% шанс встретить монстра
};

// Определения классов
const CLASSES = {
    warrior: {
        name: 'Воин',
        primaryStats: ['strength', 'agility'],
        equipment: ['Железный меч', 'Кожаная броня', 'Щит'],
        abilities: ['Удар мечом', 'Защитная стойка', 'Берсерк']
    },
    mage: {
        name: 'Маг',
        primaryStats: ['intelligence'],
        equipment: ['Деревянный посох', 'Мантия ученика', 'Книга заклинаний'],
        abilities: ['Огненный шар', 'Лечение', 'Магический щит']
    }
};

// Типы монстров
const MONSTER_TYPES = {
    goblin: {
        name: 'Гоблин',
        hp: 50,
        strength: 8,
        agility: 12,
        intelligence: 5,
        expReward: 25,
        emoji: '👺'
    },
    orc: {
        name: 'Орк',
        hp: 80,
        strength: 15,
        agility: 8,
        intelligence: 6,
        expReward: 40,
        emoji: '👹'
    },
    skeleton: {
        name: 'Скелет',
        hp: 60,
        strength: 10,
        agility: 10,
        intelligence: 8,
        expReward: 30,
        emoji: '💀'
    }
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeTelegramWebApp();
    initializeGame();
    setupEventListeners();
});

// Инициализация Telegram Web App
function initializeTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        tg.ready();
        
        // Настройка темы
        document.body.style.backgroundColor = tg.themeParams.bg_color || '#667eea';
    }
}

// Инициализация игры
function initializeGame() {
    loadGameState();
    
    if (gameState.character) {
        document.getElementById('continue-btn').style.display = 'block';
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Главное меню
    document.getElementById('new-game-btn').addEventListener('click', showCharacterCreation);
    document.getElementById('continue-btn').addEventListener('click', showGameScreen);
    
    // Создание персонажа
    document.getElementById('create-character-btn').addEventListener('click', createCharacter);
    
    // Выбор класса
    document.querySelectorAll('.class-option').forEach(option => {
        option.addEventListener('click', function() {
            selectClass(this.dataset.class);
        });
    });
    
    // Черты характера
    document.querySelectorAll('#advantages .trait').forEach(trait => {
        trait.addEventListener('click', function() {
            toggleTrait(this, 'advantage');
        });
    });
    
    document.querySelectorAll('#disadvantages .trait').forEach(trait => {
        trait.addEventListener('click', function() {
            toggleTrait(this, 'disadvantage');
        });
    });
    
    // Вкладки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Приключение
    document.getElementById('start-adventure-btn').addEventListener('click', startAdventure);
    document.getElementById('stop-adventure-btn').addEventListener('click', stopAdventure);
    
    // Сброс игры
    document.getElementById('reset-game-btn').addEventListener('click', resetGame);
    
    // Проверка ввода имени
    document.getElementById('character-name').addEventListener('input', checkCharacterCreationReady);
}

// Показать экран создания персонажа
function showCharacterCreation() {
    hideAllScreens();
    document.getElementById('character-creation').style.display = 'block';
}

// Показать игровой экран
function showGameScreen() {
    hideAllScreens();
    document.getElementById('game-screen').style.display = 'block';
    updateCharacterDisplay();
    updateAbilitiesDisplay();
}

// Скрыть все экраны
function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
}

// Выбор класса
function selectClass(className) {
    document.querySelectorAll('.class-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    document.querySelector(`[data-class="${className}"]`).classList.add('selected');
    
    checkCharacterCreationReady();
}

// Переключение черт характера
function toggleTrait(traitElement, type) {
    const maxTraits = 2;
    const selectedTraits = document.querySelectorAll(`#${type === 'advantage' ? 'advantages' : 'disadvantages'} .trait.selected`);
    
    if (traitElement.classList.contains('selected')) {
        traitElement.classList.remove('selected');
    } else if (selectedTraits.length < maxTraits) {
        traitElement.classList.add('selected');
        if (type === 'disadvantage') {
            traitElement.classList.add('disadvantage');
        }
    }
    
    checkCharacterCreationReady();
}

// Проверка готовности создания персонажа
function checkCharacterCreationReady() {
    const name = document.getElementById('character-name').value.trim();
    const selectedClass = document.querySelector('.class-option.selected');
    const createBtn = document.getElementById('create-character-btn');
    
    if (name && selectedClass) {
        createBtn.disabled = false;
    } else {
        createBtn.disabled = true;
    }
}

// Создание персонажа
function createCharacter() {
    const name = document.getElementById('character-name').value.trim();
    const selectedClass = document.querySelector('.class-option.selected').dataset.class;
    const advantages = Array.from(document.querySelectorAll('#advantages .trait.selected')).map(el => ({
        trait: el.dataset.trait,
        level: parseInt(el.dataset.level)
    }));
    const disadvantages = Array.from(document.querySelectorAll('#disadvantages .trait.selected')).map(el => ({
        trait: el.dataset.trait,
        level: parseInt(el.dataset.level)
    }));
    
    gameState.character = new Character(name, selectedClass, advantages, disadvantages);
    saveGameState();
    showGameScreen();
}

// Класс персонажа
class Character {
    constructor(name, className, advantages = [], disadvantages = []) {
        this.name = name;
        this.class = className;
        this.level = 1;
        this.exp = 0;
        this.expToNext = CONFIG.expPerLevel;
        
        // Базовые характеристики
        this.attributes = { ...CONFIG.baseAttributes };
        this.maxHP = CONFIG.baseHP;
        this.currentHP = this.maxHP;
        
        // Применение черт характера
        this.advantages = advantages;
        this.disadvantages = disadvantages;
        this.applyTraits();
        
        // Способности
        this.abilities = this.initializeAbilities();
        
        // Экипировка
        this.equipment = [...CLASSES[className].equipment];
    }
    
    applyTraits() {
        // Применение преимуществ
        this.advantages.forEach(advantage => {
            switch(advantage.trait) {
                case 'strong':
                    this.attributes.strength += 2 * advantage.level;
                    break;
                case 'agile':
                    this.attributes.agility += 2 * advantage.level;
                    break;
                case 'smart':
                    this.attributes.intelligence += 2 * advantage.level;
                    break;
                case 'tough':
                    this.maxHP += 20 * advantage.level;
                    this.currentHP = this.maxHP;
                    break;
            }
        });
        
        // Применение недостатков
        this.disadvantages.forEach(disadvantage => {
            switch(disadvantage.trait) {
                case 'weak':
                    this.attributes.strength -= disadvantage.level;
                    break;
                case 'clumsy':
                    this.attributes.agility -= disadvantage.level;
                    break;
                case 'dull':
                    this.attributes.intelligence -= disadvantage.level;
                    break;
                case 'frail':
                    this.maxHP -= 10 * disadvantage.level;
                    this.currentHP = this.maxHP;
                    break;
            }
        });
    }
    
    initializeAbilities() {
        const abilities = {};
        const classAbilities = CLASSES[this.class].abilities;
        
        classAbilities.forEach(abilityName => {
            abilities[abilityName] = {
                name: abilityName,
                level: 1,
                exp: 0,
                expToNext: 50,
                timesUsed: 0
            };
        });
        
        return abilities;
    }
    
    // Получение опыта
    gainExp(amount) {
        this.exp += amount;
        
        while (this.exp >= this.expToNext) {
            this.levelUp();
        }
    }
    
    // Повышение уровня
    levelUp() {
        this.exp -= this.expToNext;
        this.level++;
        this.expToNext = Math.floor(CONFIG.expPerLevel * Math.pow(CONFIG.expMultiplier, this.level - 1));
        
        // Автораспределение характеристик
        this.distributeAttributes();
        
        // Восстановление HP
        this.currentHP = this.maxHP;
        
        addCombatMessage(`🎉 Уровень повышен! Теперь ${this.level} уровень!`, 'victory');
    }
    
    // Автораспределение характеристик
    distributeAttributes() {
        const primaryStats = CLASSES[this.class].primaryStats;
        const pointsToDistribute = 3;
        
        if (primaryStats.length === 1) {
            this.attributes[primaryStats[0]] += pointsToDistribute;
        } else {
            // Распределить поровну между основными характеристиками
            const pointsPerStat = Math.floor(pointsToDistribute / primaryStats.length);
            const remainder = pointsToDistribute % primaryStats.length;
            
            primaryStats.forEach((stat, index) => {
                this.attributes[stat] += pointsPerStat + (index < remainder ? 1 : 0);
            });
        }
    }
    
    // Использование способности
    useAbility(abilityName) {
        if (this.abilities[abilityName]) {
            const ability = this.abilities[abilityName];
            ability.timesUsed++;
            ability.exp += 10;
            
            if (ability.exp >= ability.expToNext) {
                ability.level++;
                ability.exp = 0;
                ability.expToNext = Math.floor(ability.expToNext * 1.5);
                addCombatMessage(`✨ Способность "${abilityName}" повышена до ${ability.level} уровня!`, 'victory');
            }
        }
    }
    
    // Расчет урона
    calculateDamage(target) {
        let baseDamage;
        
        if (this.class === 'mage') {
            // Магический урон
            baseDamage = this.attributes.intelligence * 2 + Math.random() * 10;
        } else {
            // Физический урон
            baseDamage = this.attributes.strength + this.attributes.agility + Math.random() * 15;
        }
        
        // Учет защиты цели
        const defense = target.attributes ? 
            (target.attributes.agility + target.attributes.strength) * 0.3 : 
            (target.agility + target.strength) * 0.3;
        
        const finalDamage = Math.max(1, Math.floor(baseDamage - defense));
        return finalDamage;
    }
    
    // Получение урона
    takeDamage(damage) {
        this.currentHP -= damage;
        if (this.currentHP < 0) this.currentHP = 0;
        return this.currentHP <= 0;
    }
    
    // Восстановление HP
    heal(amount) {
        this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    }
}

// Класс монстра
class Monster {
    constructor(type) {
        const template = MONSTER_TYPES[type];
        this.name = template.name;
        this.type = type;
        this.maxHP = template.hp;
        this.currentHP = this.maxHP;
        this.strength = template.strength;
        this.agility = template.agility;
        this.intelligence = template.intelligence;
        this.expReward = template.expReward;
        this.emoji = template.emoji;
    }
    
    calculateDamage(target) {
        const baseDamage = this.strength + Math.random() * 10;
        const defense = target.attributes.agility * 0.2;
        return Math.max(1, Math.floor(baseDamage - defense));
    }
    
    takeDamage(damage) {
        this.currentHP -= damage;
        if (this.currentHP < 0) this.currentHP = 0;
        return this.currentHP <= 0;
    }
}

// Переключение вкладок
function switchTab(tabName) {
    // Обновить кнопки вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Показать содержимое вкладки
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Обновить содержимое при необходимости
    if (tabName === 'character') {
        updateCharacterDisplay();
    } else if (tabName === 'abilities') {
        updateAbilitiesDisplay();
    }
}

// Обновление отображения персонажа
function updateCharacterDisplay() {
    if (!gameState.character) return;
    
    const char = gameState.character;
    
    document.getElementById('char-name').textContent = char.name;
    document.getElementById('char-level').textContent = `Уровень ${char.level}`;
    document.getElementById('char-hp').textContent = `${char.currentHP}/${char.maxHP}`;
    document.getElementById('char-exp').textContent = `${char.exp}/${char.expToNext}`;
    document.getElementById('char-strength').textContent = char.attributes.strength;
    document.getElementById('char-agility').textContent = char.attributes.agility;
    document.getElementById('char-intelligence').textContent = char.attributes.intelligence;
    
    // Обновить экипировку
    const equipmentDiv = document.getElementById('char-equipment');
    equipmentDiv.innerHTML = '';
    char.equipment.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'equipment-item';
        itemDiv.textContent = item;
        equipmentDiv.appendChild(itemDiv);
    });
}

// Обновление отображения способностей
function updateAbilitiesDisplay() {
    if (!gameState.character) return;
    
    const abilitiesList = document.getElementById('abilities-list');
    abilitiesList.innerHTML = '';
    
    Object.values(gameState.character.abilities).forEach(ability => {
        const abilityDiv = document.createElement('div');
        abilityDiv.className = 'ability-item';
        
        const progressPercent = (ability.exp / ability.expToNext) * 100;
        
        abilityDiv.innerHTML = `
            <div class="ability-header">
                <span class="ability-name">${ability.name}</span>
                <span class="ability-level">Ур. ${ability.level}</span>
            </div>
            <div class="ability-description">Использовано: ${ability.timesUsed} раз</div>
            <div class="ability-progress">
                <div class="ability-progress-bar" style="width: ${progressPercent}%"></div>
            </div>
        `;
        
        abilitiesList.appendChild(abilityDiv);
    });
}

// Начало приключения
function startAdventure() {
    if (gameState.isAdventuring) return;
    
    gameState.isAdventuring = true;
    document.getElementById('start-adventure-btn').style.display = 'none';
    document.getElementById('stop-adventure-btn').style.display = 'block';
    document.getElementById('adventure-text').textContent = 'Вы отправились в приключение...';
    
    // Запуск цикла приключения
    gameState.adventureInterval = setInterval(adventureStep, CONFIG.adventureInterval);
    
    addCombatMessage('🚶 Приключение началось!');
}

// Остановка приключения
function stopAdventure() {
    if (!gameState.isAdventuring) return;
    
    gameState.isAdventuring = false;
    document.getElementById('start-adventure-btn').style.display = 'block';
    document.getElementById('stop-adventure-btn').style.display = 'none';
    document.getElementById('adventure-text').textContent = 'Вы вернулись в безопасное место.';
    
    if (gameState.adventureInterval) {
        clearInterval(gameState.adventureInterval);
        gameState.adventureInterval = null;
    }
    
    addCombatMessage('🏠 Приключение завершено.');
}

// Шаг приключения
function adventureStep() {
    if (!gameState.character || !gameState.isAdventuring) {
        stopAdventure();
        return;
    }
    
    // Проверка на встречу с монстром
    if (Math.random() < CONFIG.monsterEncounterChance) {
        encounterMonster();
    } else {
        // Случайное событие или отдых
        const events = [
            'Вы идете по тропе...',
            'Вы отдыхаете у костра.',
            'Вы исследуете окрестности.',
            'Вы находите безопасное место для отдыха.'
        ];
        
        const event = events[Math.floor(Math.random() * events.length)];
        document.getElementById('adventure-text').textContent = event;
        
        // Небольшое восстановление HP
        if (gameState.character.currentHP < gameState.character.maxHP) {
            gameState.character.heal(2);
            updateCharacterDisplay();
        }
    }
}

// Встреча с монстром
function encounterMonster() {
    const monsterTypes = Object.keys(MONSTER_TYPES);
    const randomType = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
    const monster = new Monster(randomType);
    
    document.getElementById('adventure-text').textContent = `${monster.emoji} Вы встретили ${monster.name}!`;
    addCombatMessage(`${monster.emoji} Появился ${monster.name}! (HP: ${monster.currentHP})`);
    
    // Начать бой
    startCombat(monster);
}

// Начало боя
function startCombat(monster) {
    const combatInterval = setInterval(() => {
        if (!gameState.character || !gameState.isAdventuring) {
            clearInterval(combatInterval);
            return;
        }
        
        // Ход игрока
        const playerDamage = gameState.character.calculateDamage(monster);
        const playerAbilities = Object.keys(gameState.character.abilities);
        const usedAbility = playerAbilities[Math.floor(Math.random() * playerAbilities.length)];
        
        gameState.character.useAbility(usedAbility);
        
        const monsterDied = monster.takeDamage(playerDamage);
        addCombatMessage(`⚔️ Вы используете "${usedAbility}" и наносите ${playerDamage} урона!`, 'damage');
        
        if (monsterDied) {
            // Победа
            gameState.character.gainExp(monster.expReward);
            addCombatMessage(`🎉 ${monster.name} побежден! Получено ${monster.expReward} опыта!`, 'victory');
            document.getElementById('adventure-text').textContent = 'Вы продолжаете путешествие...';
            clearInterval(combatInterval);
            updateCharacterDisplay();
            updateAbilitiesDisplay();
            saveGameState();
            return;
        }
        
        // Ход монстра
        const monsterDamage = monster.calculateDamage(gameState.character);
        const playerDied = gameState.character.takeDamage(monsterDamage);
        addCombatMessage(`${monster.emoji} ${monster.name} наносит вам ${monsterDamage} урона!`, 'damage');
        
        if (playerDied) {
            // Поражение
            addCombatMessage('💀 Вы погибли! Приключение завершено.', 'damage');
            gameState.character.currentHP = Math.floor(gameState.character.maxHP * 0.5);
            stopAdventure();
            clearInterval(combatInterval);
            updateCharacterDisplay();
            saveGameState();
            return;
        }
        
        updateCharacterDisplay();
    }, 1500); // Ход каждые 1.5 секунды
}

// Добавление сообщения в лог боя
function addCombatMessage(message, type = '') {
    const messagesDiv = document.getElementById('combat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `combat-message ${type}`;
    messageDiv.textContent = message;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Ограничить количество сообщений
    while (messagesDiv.children.length > 20) {
        messagesDiv.removeChild(messagesDiv.firstChild);
    }
}

// Сохранение состояния игры
function saveGameState() {
    try {
        localStorage.setItem('rpg-game-state', JSON.stringify({
            character: gameState.character,
            combatLog: gameState.combatLog
        }));
    } catch (e) {
        console.error('Ошибка сохранения:', e);
    }
}

// Загрузка состояния игры
function loadGameState() {
    try {
        const saved = localStorage.getItem('rpg-game-state');
        if (saved) {
            const data = JSON.parse(saved);
            
            if (data.character) {
                // Восстановить персонажа
                gameState.character = Object.assign(new Character('', 'warrior'), data.character);
                gameState.combatLog = data.combatLog || [];
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки:', e);
    }
}

// Сброс игры
function resetGame() {
    if (confirm('Вы уверены, что хотите сбросить игру? Весь прогресс будет потерян!')) {
        localStorage.removeItem('rpg-game-state');
        gameState = {
            character: null,
            isAdventuring: false,
            adventureInterval: null,
            monsters: [],
            combatLog: []
        };
        
        stopAdventure();
        hideAllScreens();
        document.getElementById('main-menu').style.display = 'block';
        document.getElementById('continue-btn').style.display = 'none';
        
        // Очистить формы
        document.getElementById('character-name').value = '';
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        document.getElementById('combat-messages').innerHTML = '';
    }
}