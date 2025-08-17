const GameController = require("../controllers/gameController");
const GameService = require("../services/gameService");
const RoleService = require("../services/roleService");

module.exports = async (interaction) => {
    if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;

    const [actionType, refId] = interaction.customId.split('|');
    if (actionType === 'night_action') {
        const currentGame = await GameService.getGameByChannel(refId);
        const player = currentGame.player.find(p => p.userId === interaction.user.id);
        const role = await RoleService.getRoleById(player.roleId);
        const selectedValue = interaction.values[0];
        switch (role.enName) {
            case 'Wolf':
                await GameController.wolfVote(currentGame._id, interaction.user.id, selectedValue, interaction);
                break;
            case 'Seer':
                await GameController.seerAction(currentGame._id, interaction.user.id, selectedValue, interaction);
                break;
            // Thêm các trường hợp khác cho các vai trò khác
            case 'Cover':
                await GameController.coverUser(currentGame._id, interaction.user.id, selectedValue, interaction);
                break;
            default:
                await interaction.reply({ content: "Vai trò không hợp lệ.", ephemeral: true });
        }
    }
    if (actionType === 'night_action_wolf') {
        // refId lúc này là channelId của game trong guild
        const currentGame = await GameService.getGameByChannel(refId);
        const selectedValue = interaction.values[0];
        await GameController.wolfVote(currentGame._id, interaction.user.id, selectedValue, interaction);

        // return interaction.reply({ content: "Đã gửi lựa chọn của bạn.", ephemeral: true });
    }
    if (actionType === 'night_action_seer') {

        const currentGame = await GameService.getGameByChannel(refId);
        const selectedValue = interaction.values[0];
        await GameController.seerAction(currentGame._id, interaction.user.id, selectedValue, interaction);

        // return interaction.reply({ content: "Đã gửi lựa chọn của bạn.", ephemeral: true });

    }
    if (actionType === 'night_action_cupid') {
        const currentGame = await GameService.getGameByChannel(refId);
        const selectedValues = interaction.values; // loverIds
        await GameController.cupidAction(currentGame._id, interaction.user.id, selectedValues, interaction);

        // return interaction.reply({ content: "Đã gửi lựa chọn của bạn.", ephemeral: true });
    }
    if (actionType === 'night_action_hunter') {
        const currentGame = await GameService.getGameByChannel(refId);
        const selectedValues = interaction.values; // loverIds
        await GameController.hunterAction(currentGame._id, interaction.user.id, selectedValues, interaction);

        // return interaction.reply({ content: "Đã gửi lựa chọn của bạn.", ephemeral: true });
    }
    if (actionType === 'night_action_cover') {
        const currentGame = await GameService.getGameByChannel(refId);
        const selectedValue = interaction.values[0]; // userId
        await GameController.coverUser(currentGame._id, interaction.user.id, selectedValue, interaction);

        // return interaction.reply({ content: "Đã gửi lựa chọn của bạn.", ephemeral: true });
    }
    if (actionType === 'night_action_skip') {
        const currentGame = await GameService.getGameByChannel(refId);
        await GameController.skip_Night_Action(currentGame._id, interaction.user.id, interaction);
    }
    // Nếu actionType bắt đầu bằng night_action thì
    if (actionType.startsWith('night_action')) {
        const currentGame = await GameService.getGameByChannel(refId);
        const isEndNight = await GameController.checkNightPhaseEnd(currentGame);
        if (isEndNight) {
            // const selectedValue = interaction.values[0]; // userId hoặc 'skip'
            // const currentGame = await GameService.getGameByChannel(refId);

            GameController.identifyTheDeath(currentGame, interaction)
            return GameController.handleStartDayPhase(currentGame, interaction);
            // await interaction.reply({ content: "Đêm đã kết thúc.", ephemeral: true });
        }
    }
    if (actionType === 'day_vote') {

        return await GameController.handleVoting(interaction);
    }
    if(actionType === 'day_action_skip')
        return await GameController.daySkipAction(interaction)
    if (actionType === 'view_role') {
        return await GameController.handleGetRole(interaction);
    }
};

// client.on('interactionCreate', async (interaction) => {
//     try {
//         // Chỉ xử lý select menu
//         if (!interaction.isStringSelectMenu()) return;

//         // Check customId
//         if (interaction.customId === 'night_action') {
//             const selectedValue = interaction.values[0]; // userId hoặc 'skip'

//             // Nếu bỏ qua hành động
//             if (selectedValue === 'skip') {
//                 await interaction.reply({ content: 'Bạn đã bỏ qua hành động đêm nay ✅', ephemeral: true });
//                 console.log(`${interaction.user.id} skipped their action`);
//                 return;
//             }

//             // Nếu chọn target
//             await interaction.reply({ content: `Bạn đã chọn mục tiêu: <@${selectedValue}> 🎯`, ephemeral: true });
//             console.log(`${interaction.user.id} selected ${selectedValue}`);

//             // TODO: Lưu vào database hành động đêm
//             await NightActionService.saveAction({
//                 gameId: currentGame._id,
//                 playerId: interaction.user.id,
//                 targetId: selectedValue
//             });
//         }
//     } catch (err) {
//         console.error('Error handling night_action:', err);
//     }
// });
