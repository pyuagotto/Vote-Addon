//@ts-check
import { CommandPermissionLevel, CustomCommandOrigin, CustomCommandStatus, Player, system, world } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import config from './config.js';

const KEY = 0;
const VALUE = 1;

let voteStatus = 0;
let vgetStatus = false;
let vResultMap = new Map();

//投票した人, 投票先
let vgetMap = new Map();
let playersName = [];

/**
 * @param {Number} a 
 * @param {Number} b 
 */
const compareFunc = function(a, b) {
    return b - a;
};

/**
 * @param {String} playerName 
 */
const getPlayer = function(playerName){
    for(const player of world.getPlayers()){
        if(player.name === playerName){
            return player;
        }
    }
};

/**
 * @param {Player} player 
 */
const showVoteForm = function(player){
    /**
     * @type {String[]}
     */
    let votePlayerList = [];

    if(config.canVoteMyself){
        votePlayerList = playersName;
    }else{
        for(const playerName of playersName){
            if(playerName != player.name) votePlayerList.push(playerName);
        }
    }
   
    if(votePlayerList.length === 0){
        player.sendMessage("§c投票可能なプレイヤーが存在しません！！§r");
    }else{
        const modalForm = new ModalFormData();
        modalForm.title("投票");
        modalForm.dropdown("\n\n\nプレイヤー", votePlayerList, { defaultValueIndex: 0 });
        modalForm.show(player).then((res)=>{
            const index = res.formValues && res.formValues[0];

            if(typeof(index) == 'number') {
                //投票先のプレイヤーの名前
                const votedPlayerName = votePlayerList[index];
    
                //投票先のプレイヤーの名前から<Player>を取得
                const votedPlayer = getPlayer(votePlayerList[index]);
                if(!votedPlayer) return;
    
                //表示用兼保存用スコアボード
                world.scoreboard.getObjective(config.objectiveId1)?.addScore(votedPlayerName, 1);
                //コマンド用スコアボード
                world.scoreboard.getObjective(config.objectiveId2)?.addScore(votedPlayer, 1);
                vgetMap.set(player.name, votedPlayerName);
                player.sendMessage(votedPlayerName + " に投票しました。");
                
                player.setDynamicProperty("voted", true);
            }
        });
    }
};

/**
 * @param {Player} player 
 */
const showVgetForm = function(player){
    let vgetBody = "";
    let enter = 13;

    for(const vnk of vgetMap){
        vgetBody += vnk[KEY] + " => " + vnk[VALUE] + "\n";
        enter--;
    }

    for(let i = 0; i < enter; i++){
        vgetBody += "\n";
    }
    
    const actionForm = new ActionFormData();
    actionForm.title("投票先");
    actionForm.body(vgetBody);
    actionForm.button("閉じる");
    actionForm.show(player);
};

/**
 * @param {CustomCommandOrigin} origin 
 * @returns { { status: CustomCommandStatus, message?: string } }
 */
const vs = function(origin){
    switch(voteStatus){
        case 0:
            world.sendMessage("§6投票が開始されました。§r");
            world.sendMessage(`§a${config.itemName}を右クリックして投票先を選択してください。§r`);
            //scoreboard削除 & 追加
            const sb1 = world.scoreboard.getObjective(config.objectiveId1);
            const sb2 = world.scoreboard.getObjective(config.objectiveId2);
            
            system.run(()=>{
                if(sb1) world.scoreboard.removeObjective(sb1);
                if(sb2) world.scoreboard.removeObjective(sb2);
                world.scoreboard.addObjective(config.objectiveId1);
                world.scoreboard.addObjective(config.objectiveId2);
            });

            //投票可能なプレイヤーを配列に追加
            for(const player of world.getPlayers()){
                player.setDynamicProperty("voted", false);
                if(player.hasTag(config.canVoteTag)){
                    system.run(()=>{
                        sb1?.setScore(player.name, 0);
                        sb2?.setScore(player, 0);
                    });
                    
                    playersName.push(player.name);
                }
            }

            voteStatus = 1;
            return { status: CustomCommandStatus.Success };

        case 1:
            world.sendMessage("§6投票結果を開示します。§r");
            world.sendMessage("§b==========投票結果==========§r");

            //投票結果をscoreboardからMapに
            const vResultList = world.scoreboard.getObjective(config.objectiveId1)?.getScores();
            if(!vResultList) return { status: CustomCommandStatus.Failure, message: `${config.objectiveId1}が存在しません` };

            for(const vResult of vResultList){
                if(vResult.score !== 0) vResultMap.set(vResult.participant.displayName, vResult.score);
            }

            const vResultArray = [];
            const sortedvResultMap = new Map();

            for(const value of vResultMap.values()){
                vResultArray.push(value);
            }

            vResultArray.sort(compareFunc);

            for(const score of vResultArray){
                for(const vnk of vResultMap){
                    if(vnk[VALUE] === score){
                        sortedvResultMap.set(vnk[KEY], vnk[VALUE]);
                    }
                }
            }

            let n = 1;//順位用変数
            let count = 1;//実行回数変数
            let num = 1;//数値比較用変数

            for(const vnk of sortedvResultMap){
                if(count != 1){
                    if(num != vnk[VALUE]){
                        n = count;
                    }
                }

                world.sendMessage(`§a${n}位: ${vnk[KEY]} [${vnk[VALUE]}票]§r`);
                num = vnk[VALUE];
                count++;
            }

            world.sendMessage("§b==========投票結果==========§r");
            voteStatus = 2;
            return { status: CustomCommandStatus.Success };

        default :
            world.sendMessage("§6投票結果をリセットします。§r");
            vResultMap.clear();
            vgetMap.clear();
            playersName.length = 0;
            voteStatus = 0;
            vgetStatus = false;

            return { status: CustomCommandStatus.Success };
    }
};

/**
 * @param {CustomCommandOrigin} origin 
 * @returns { { status: CustomCommandStatus, message?: string } }
 */
const vget = function(origin){
    switch(voteStatus){
        case 0:
            return { status: CustomCommandStatus.Failure, message: "投票は開始されていません。" };

        case 1:
            return { status: CustomCommandStatus.Failure, message: "投票は終了していません。" };

        default :
            if(!vgetStatus){
                world.sendMessage("§6投票先を開示します。§r");
                world.sendMessage("§b本を右クリックして確認してください。")
                vgetStatus = true;
                return { status: CustomCommandStatus.Success };
            }else{
                return { status: CustomCommandStatus.Failure, message: "投票先はすでに開示されています。" };
            }
    }
};

system.runInterval(()=>{
    if(config.checkmark){
        for(const player of world.getPlayers()){
            if(voteStatus === 1){
                if(player.getDynamicProperty("voted")) player.nameTag = "[§6✓§r]" + player.name;  
                else player.nameTag = "[§7✕§r]" + player.name;
            }else{
                player.nameTag = player.name;
            }
        }
    }
},1);

world.afterEvents.itemUse.subscribe((ev)=>{
    const { source, itemStack } = ev;

    if(itemStack.typeId === config.itemId){
        
        switch(voteStatus){
            case 0:
                source.sendMessage("§c投票は開始されていません。§r");
                break;

            case 1:
                if(!source.getDynamicProperty("voted")){
                    showVoteForm(source);
                }else{
                    source.sendMessage("すでに投票しています。");
                }
                
                break;

            default:
                if(vgetStatus){
                    showVgetForm(source);
                }else{
                    source.sendMessage("§c投票先は開示されていません。§r");
                }
        }
    }
});

system.beforeEvents.startup.subscribe((ev) => {
    /**
     * 
     * @param {string} name 
     * @param {string} description 
     * @param {(origin: CustomCommandOrigin) => { status: CustomCommandStatus }} callback 
     */
    const registerCommand = function(name, description, callback) {
        ev.customCommandRegistry.registerCommand(
            {
                name,
                description,
                permissionLevel: CommandPermissionLevel.GameDirectors,
            },
            callback
        );
    };

    registerCommand(
        "vote:start",
        "投票を開始します",
        vs
    );

    registerCommand(
        "vote:get",
        "投票先を開示します",
        vget
    );
});