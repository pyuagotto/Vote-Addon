export default ({
    itemId : "minecraft:book", //投票に使用するアイテムのID
    itemName: "本", //投票に使用するアイテムの名前(任意の文字列可)
    canVoteTag: "canVote", //投票先プレイヤーにつけるタグ(タグがないプレイヤーはリストに表示されない)
    objectiveId1: "vote", //投票結果を保存スコアボードのオブジェクト名(表示用)
    objectiveId2: "vote_command", //投票結果を保存スコアボードのオブジェクト名(コマンド用)
    checkmark: true, //投票時、投票が完了したか否かをnametagに表示(ほかのアドオンと競合する可能性あり)
    canVoteMyself: true, //自分自身への投票を許可するかどうか(trueで許可、falseで不可)
});