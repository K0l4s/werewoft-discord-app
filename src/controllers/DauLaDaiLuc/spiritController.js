const { EmbedBuilder, ActionRowBuilder } = require("discord.js");
const { ITEM_RARITY } = require("../../config/constants");
const SpiritService = require("../../services/DauLaDaiLuc/spiritService");
const SpiritMaster = require("../../models/DauLaDaiLuc/SpiritMaster");
const Item = require("../../models/Item");
const Inventory = require("../../models/Inventory");
const Spirit = require("../../models/DauLaDaiLuc/Spirit");
const SpiritRing = require("../../models/DauLaDaiLuc/SpiritRing");
const { default: mongoose } = require("mongoose");
const UserService = require("../../services/userService");

class SpiritController {
    static async awakenRandomSpirit(userId) {
        try {
            // Đếm số lần thức tỉnh của userId
            const awakeningCount = await SpiritMaster.countDocuments({ userId });

            // Nếu đã thức tỉnh 2 lần
            if (awakeningCount >= 2) {
                return SpiritController.createErrorEmbed('❌ Đã đạt giới hạn thức tỉnh!', 'Bạn đã thức tỉnh tối đa 2 vũ hồn. Không thể thức tỉnh thêm.');
            }

            // Nếu đã thức tỉnh 1 lần (chuẩn bị thức tỉnh lần 2)
            if (awakeningCount === 1) {
                // Kiểm tra vật phẩm "Tẩy lễ võ hồn"
                const resetItem = await Item.findOne({
                    itemRef: 'SPI1',
                });

                if (!resetItem) {
                    return SpiritController.createErrorEmbed('❌ Lỗi hệ thống!', 'Vật phẩm thức tỉnh không tồn tại.');
                }

                // Kiểm tra trong inventory
                const userInventory = await Inventory.findOne({
                    userId,
                    item: resetItem._id
                });

                if (!userInventory || userInventory.quantity < 1) {
                    return SpiritController.createErrorEmbed('❌ Thiếu vật phẩm!', 'Bạn cần có "Tẩy lễ võ hồn" để thức tỉnh song sinh võ hồn.');
                }

                // Trừ vật phẩm
                await Inventory.findOneAndUpdate(
                    { userId, item: resetItem._id },
                    { $inc: { quantity: -1 } }
                );
            }

            // Lấy ngẫu nhiên một vũ hồn từ database
            const randomSpirit = await SpiritController.getRandomSpirit();

            if (!randomSpirit) {
                return SpiritController.createErrorEmbed('❌ Lỗi hệ thống!', 'Không tìm thấy vũ hồn nào trong database.');
            }

            // Tạo record thức tỉnh mới
            const newSpiritMaster = new SpiritMaster({
                userId,
                spirit: randomSpirit._id,
                equipRing: []
            });

            await newSpiritMaster.save();

            // Lấy tất cả vũ hồn của user để hiển thị
            const userSpirits = await SpiritMaster.find({ userId })
                .populate('spirit')
            // .populate('equipRing');

            return SpiritController.createSuccessEmbed(userSpirits, awakeningCount + 1);

        } catch (error) {
            console.error('Lỗi thức tỉnh vũ hồn:', error);
            return SpiritController.createErrorEmbed('❌ Lỗi hệ thống!', 'Đã xảy ra lỗi khi thức tỉnh vũ hồn.');
        }
    }
    static getLvlTitle(masterLvl) {
        if (masterLvl >= 1 && masterLvl <= 9) return "Hồn Sĩ";
        if (masterLvl >= 10 && masterLvl <= 19) return "Hồn Sư";
        if (masterLvl >= 20 && masterLvl <= 29) return "Đại Hồn Sư";
        if (masterLvl >= 30 && masterLvl <= 39) return "Hồn Tôn";
        if (masterLvl >= 40 && masterLvl <= 49) return "Hồn Tông";
        if (masterLvl >= 50 && masterLvl <= 59) return "Hồn Vương";
        if (masterLvl >= 60 && masterLvl <= 69) return "Hồn Đế";
        if (masterLvl >= 70 && masterLvl <= 79) return "Hồn Thánh";
        if (masterLvl >= 80 && masterLvl <= 89) return "Hồn Đấu La";
        if (masterLvl >= 90 && masterLvl <= 94) return "Phong Hào Đấu La";
        if (masterLvl >= 95 && masterLvl <= 99) return "Siêu Cấp Đấu La";
        if (masterLvl >= 100) return "Cực Hạn Đấu La";
        return "Phàm Nhân"; // fallback nếu < 1
    }

    static async attachRing(userId, spiritRef, ringRef) {
        const embed = new EmbedBuilder();
        embed.setTitle("Không có gì để hiển thị")
            .setDescription("Không có gì để hiển thị")
        console.log("Ring")
        const spirit = await SpiritService.getSpiritByRef(spiritRef);
        const user = await UserService.findUserById(userId);
        if (!spirit) {
            embed.setTitle("Error")
                .setDescription("❌Không tìm thấy Võ Hồn này!")
            return { embeds: [embed] };
        };
        const master = await SpiritMaster.findOne({ userId, spirit: spirit._id });
        if (!master) {
            embed.setTitle("Error")
                .setDescription("❌Bạn chưa có võ hồn, hãy thức tỉnh bằng `/awake` và `/hunt` để cày cấp trước!")
            return { embeds: [embed] };
        };
        // throw new Error(" Người này chưa có SpiritMaster cho võ hồn này")
        if (master.equipRing.length >= 9) {
            embed.setTitle("Error")
                .setDescription("❌Đã đủ 9 hồn hoàn, hãy tháo hồn hoàn trước `/remove [spirit Ref] [ring Ref]`")
            return { embeds: [embed] };
        };
        if (user.spiritLvl <= 9) {
            embed.setTitle("Error")
                .setDescription("❌ Cấp độ của bạn không đủ để gắn hồn hoàn đầu tiên! Hãy cày cấp bằng `/hunt` trước!")
            return { embeds: [embed] };
        };
        const userConditionLvl = Math.floor(user.spiritLvl / 10)
        // throw new Error()

        if (master.equipRing.length >= userConditionLvl) {
            embed.setTitle("Error")
                .setDescription(`❌ Bạn đang ở cấp độ ${user.spiritLvl} ${this.getLvlTitle(user.spiritLvl)} và đã trang bị đủ ${master.equipRing.length}/${userConditionLvl} hồn hoàn cho võ hồn này! Hãy mau chóng tấn cấp!`)
            return { embeds: [embed] };
        };
        const ring = await SpiritRing.findOne({ ringRef: ringRef });
        if (!ring) {
            embed.setTitle("Error")
                .setDescription("❌ Không tìm thấy hồn hoàn này!")
            return { embeds: [embed] };
        };
        if (ring.userId != userId) {
            embed.setTitle("Error")
                .setDescription("❌ Hồn hoàn này không thuộc về bạn!")
            return { embeds: [embed] };
        };
        if (ring.isAttach) {
            embed.setTitle("Error")
                .setDescription("❌ Bạn đã trang bị hồn hoàn này hãy gỡ bỏ nó trước bằng `/remove [spirit Ref] [ring Ref]`")
            return { embeds: [embed] };
        };
        master.equipRing.push(ring._id);
        await master.save();
        ring.isAttach = true;
        await ring.save();
        embed.setTitle("Trang bị hồn hoàn thành công!")
            .setDescription(`Bạn đã trang bị hồn hoàn **${ring.years.toLocaleString("en-US")} năm** cho võ hồn ${spirit.icon} **${spirit.name}**`)
            .setThumbnail(spirit.imgUrl || "https://cdn-icons-png.flaticon.com/512/7486/7486754.png")
        return { embeds: [embed] }
        // return master;
    }
    static async removeRing(userId, spiritRef, ringRef) {
        const embed = new EmbedBuilder();
        embed.setTitle("Không có gì để hiển thị")
            .setDescription("Không có gì để hiển thị")

        const spirit = await SpiritService.getSpiritByRef(spiritRef);
        const user = await UserService.findUserById(userId);

        const master = await SpiritMaster.findOne({ userId, spirit: spirit._id });
        if (!master) {
            embed.setTitle("Error")
                .setDescription("❌ Bạn chưa có võ hồn này!")
            return { embeds: [embed] };
        }

        if (master.equipRing.length === 0) {
            embed.setTitle("Error")
                .setDescription("❌ Võ hồn này chưa có hồn hoàn nào để tháo!")
            return { embeds: [embed] };
        }

        const ring = await SpiritRing.findOne({ ringRef: ringRef });
        if (!ring) {
            embed.setTitle("Error")
                .setDescription("❌ Không tìm thấy hồn hoàn này!")
            return { embeds: [embed] };
        }

        if (ring.userId != userId) {
            embed.setTitle("Error")
                .setDescription("❌ Hồn hoàn này không thuộc về bạn!")
            return { embeds: [embed] };
        }

        if (!ring.isAttach) {
            embed.setTitle("Error")
                .setDescription("❌ Hồn hoàn này chưa được trang bị, không thể tháo!")
            return { embeds: [embed] };
        }

        // Kiểm tra ring có thực sự nằm trong equipRing không
        const index = master.equipRing.indexOf(ring._id);
        if (index === -1) {
            embed.setTitle("Error")
                .setDescription("❌ Hồn hoàn này không được gắn vào võ hồn này!")
            return { embeds: [embed] };
        }

        // Thực hiện gỡ bỏ
        master.equipRing.splice(index, 1);
        await master.save();

        ring.isAttach = false;
        await ring.save();

        embed.setTitle("Gỡ hồn hoàn thành công!")
            .setDescription(`Bạn đã gỡ hồn hoàn **${ring.years.toLocaleString("en-US")} năm** khỏi võ hồn ${spirit.icon} **${spirit.name}**`)
            .setThumbnail(spirit.imgUrl || "https://cdn-icons-png.flaticon.com/512/7486/7486754.png")

        return { embeds: [embed] };
    }

    static async getSpiritInfo(userId) {
        try {
            // Lấy tất cả spirit master của user - CHỈ POPULATE SPIRIT
            const spiritMasters = await SpiritMaster.find({ userId })
                .populate('spirit')
                .populate('equipRing'); // POPULATE equipRing để lấy chi tiết hồn hoàn

            if (spiritMasters.length === 0) {
                return { content: '❌ Bạn chưa thức tỉnh vũ hồn nào. Hãy sử dụng `/awake` để thức tỉnh.' };
            }

            // Tạo embed cho từng vũ hồn
            const embeds = [];

            for (const spiritMaster of spiritMasters) {
                const spirit = spiritMaster.spirit;

                // Lấy thông tin spirit rings
                let spiritRings = [];
                let ringsStats = { hp: 0, atk: 0, def: 0, sp: 0 };

                if (spiritMaster.equipRing && spiritMaster.equipRing.length > 0) {
                    spiritRings = spiritMaster.equipRing;

                    // Tính tổng bonus từ các hồn hoàn
                    spiritRings.forEach(ring => {
                        if (ring) { // Kiểm tra ring không null
                            ringsStats.hp += ring.hp || 0;
                            ringsStats.atk += ring.atk || 0;
                            ringsStats.def += ring.def || 0;
                            ringsStats.sp += ring.sp || 0;
                        }
                    });
                }

                const totalStats = this.calculateTotalStats(spirit, spiritRings);

                const embed = new EmbedBuilder()
                    .setColor(this.getRarityColor(spirit.rarity))
                    .setTitle(`${spirit.icon ? spirit.icon : "<:LamNganThao:1409172636910751805>"} [Ref:${spirit.ref}] ${spirit.name} - ${spirit.rarity}`)
                    .setThumbnail(spirit.imgUrl)
                // .setDescription(spirit.description || 'Không có mô tả');

                // Thêm chỉ số cơ bản của spirit
                const fields = [
                    { name: '❤️ HP', value: spirit.hp.toString(), inline: true },
                    { name: '⚔️ ATK', value: spirit.atk.toString(), inline: true },
                    { name: '🛡️ DEF', value: spirit.def.toString(), inline: true },
                    { name: '🌀 SP', value: spirit.sp.toString(), inline: true }
                ];

                // Hiển thị hồn hoàn theo chiều ngang (3 hàng x 3 cột)
                let ringsDisplay = '';
                let ringCount = 0;

                // let ringsDisplay = "";
                for (let i = 0; i < 9; i++) {
                    if (i < spiritRings.length && spiritRings[i]) {
                        ringsDisplay += `${spiritRings[i].icon || '❓'}`;
                        ringCount++;
                    } else {
                        ringsDisplay += '❏ ';
                    }
                }
                console.log(ringsDisplay)

                // Hiển thị thông tin years của các hồn hoàn
                let ringsInfo = '';
                spiritRings.forEach((ring, index) => {
                    if (ring) {
                        ringsInfo += `${ring.icon || '❓'} **${ring.years || '?'} năm [Ref: ${ring.ringRef}]**${index < spiritRings.length - 1 ? ' • ' : ''}`;
                    }
                });

                if (ringCount > 0) {
                    fields.push(
                        {
                            name: `<a:1000nam:1408868369951752233> Hồn Hoàn (${ringCount}/9)`,
                            value: ringsDisplay,
                            inline: false
                        },
                        {
                            name: '📋 Chi Tiết Hồn Hoàn',
                            value: ringsInfo || 'Không có thông tin',
                            inline: false
                        },
                        {
                            name: '📊 Bonus từ Hồn Hoàn',
                            value: `❤️ +${ringsStats.hp} | ⚔️ +${ringsStats.atk} | 🛡️ +${ringsStats.def} | 🌀 +${ringsStats.sp}`,
                            inline: false
                        }
                    );
                } else {
                    fields.push({
                        name: '<a:1000nam:1408868369951752233> Hồn Hoàn (0/9)',
                        value: '❏ ❏ ❏ ❏ ❏ ❏ ❏ ❏ ❏',
                        inline: false
                    });
                }

                // Thêm tổng chỉ số
                fields.push({
                    name: '🎯 Tổng Chỉ Số',
                    value: `❤️ **${totalStats.hp}** | ⚔️ **${totalStats.atk}** | 🛡️ **${totalStats.def}** | 🌀 **${totalStats.sp}**`,
                    inline: false
                });

                // Thêm thông tin tiến hóa nếu có
                if (spirit.nextId) {
                    fields.push({
                        name: '✨ Có thể tiến hóa',
                        value: `Vũ hồn này có thể tiến hóa lên cấp cao hơn`,
                        inline: false
                    });
                }

                embed.addFields(fields)
                    .setFooter({ text: `Vũ hồn của ${userId}` })
                    .setTimestamp();

                embeds.push(embed);
            }

            return { embeds: embeds };

        } catch (error) {
            console.error('Lỗi khi lấy thông tin vũ hồn:', error);
            return { content: '❌ Đã xảy ra lỡi khi lấy thông tin vũ hồn.' };
        }
    }

    // Hàm tính tổng chỉ số (xử lý spiritRings có thể null/undefined)
    static calculateTotalStats(spirit, spiritRings = []) {
        const totalStats = {
            hp: spirit.hp || 0,
            atk: spirit.atk || 0,
            def: spirit.def || 0,
            sp: spirit.sp || 0
        };

        // Chỉ cộng thêm nếu spiritRings là array và có phần tử
        if (Array.isArray(spiritRings) && spiritRings.length > 0) {
            // Nếu là object có chứa stats
            if (spiritRings[0].hp !== undefined) {
                spiritRings.forEach(ring => {
                    totalStats.hp += ring.hp || 0;
                    totalStats.atk += ring.atk || 0;
                    totalStats.def += ring.def || 0;
                    totalStats.sp += ring.sp || 0;
                });
            }
            // Nếu không có stats, chỉ cộng bonus cố định (ví dụ: mỗi hồn hoàn +10 stats)
            else {
                const bonusPerRing = 10;
                totalStats.hp += spiritRings.length * bonusPerRing;
                totalStats.atk += spiritRings.length * bonusPerRing;
                totalStats.def += spiritRings.length * bonusPerRing;
                totalStats.sp += spiritRings.length * bonusPerRing;
            }
        }

        return totalStats;
    }



    // Hàm lấy ngẫu nhiên một vũ hồn từ database
    static async getRandomSpirit() {
        try {
            const [spirit] = await Spirit.aggregate([
                { $match: { isFirstAwake: true } }, // lọc trước
                { $sample: { size: 1 } }             // random 1 document
            ]);

            return spirit || null;
        } catch (error) {
            console.error('Lỗi khi lấy vũ hồn ngẫu nhiên:', error);
            return null;
        }
    }


    // Hàm tạo embed lỗi
    static createErrorEmbed(title, description) {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    // Hàm tạo embed thành công
    static createSuccessEmbed(userSpirits, awakeningNumber) {
        const latestSpirit = userSpirits[userSpirits.length - 1].spirit;
        const isSecondAwakening = awakeningNumber === 2;

        const embed = new EmbedBuilder()
            .setColor(SpiritController.getRarityColor(latestSpirit.rarity))
            .setTitle(`🎉 ${isSecondAwakening ? 'Thức Tỉnh Song Thành Công!' : 'Thức Tỉnh Thành Công!'}`)
            .setDescription(`**${latestSpirit.name}** - ${latestSpirit.rarity} (Thức tỉnh lần ${awakeningNumber})`)
            .setThumbnail(latestSpirit.imgUrl)
            .addFields(
                { name: '📛 Tên Vũ Hồn', value: latestSpirit.name, inline: true },
                { name: '⭐ Cấp Độ', value: latestSpirit.rarity, inline: true },
                { name: '⚔️ Tấn Công', value: latestSpirit.atk.toString(), inline: true },
                { name: '🛡️ Phòng Thủ', value: latestSpirit.def.toString(), inline: true },
                { name: '🌀 Tốc Độ', value: latestSpirit.sp.toString(), inline: true },
                { name: '📖 Mô Tả', value: latestSpirit.description.substring(0, 100) + (latestSpirit.description.length > 100 ? '...' : '') }
            );

        // Thêm thông tin về số vũ hồn hiện có
        if (isSecondAwakening) {
            embed.addFields(
                { name: '🎯 Trạng thái', value: 'Đã thức tỉnh song sinh vũ hồn!', inline: false }
            );
        }

        embed.setFooter({
            text: isSecondAwakening ?
                'Song sinh võ hồn đã được kích hoạt!' :
                `Bạn có thể thức tỉnh thêm ${2 - awakeningNumber} vũ hồn nữa`
        }).setTimestamp();

        return embed;
    }

    // Hàm lấy màu theo rarity
    static getRarityColor(rarity) {
        const rarityColors = {
            'C': 0x808080, 'SM': 0x00FF00, 'R': 0x0000FF, 'SR': 0x800080,
            'E': 0xFFA500, 'SE': 0xFF0000, 'L': 0xFFFF00, 'SL': 0x00FFFF,
            'MY': 0xFF00FF, 'SMY': 0xFFD700
        };
        return rarityColors[rarity] || 0xFFFFFF;
    }

    // Hàm tạo embed danh sách vũ hồn
    static createSpiritListEmbed(userSpirits, userId) {
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`📋 Danh sách Vũ Hồn - User: ${userId}`)
            .setDescription(`Tổng số: ${userSpirits.length}/2 vũ hồn`);

        userSpirits.forEach((spiritMaster, index) => {
            const spirit = spiritMaster.spirit;
            embed.addFields({
                name: `🎯 Vũ Hồn ${index + 1}: ${spirit.name} [${spirit.rarity}]`,
                value: `⚔️ ATK: ${spirit.atk} | 🛡️ DEF: ${spirit.def} | 🌀 SP: ${spirit.sp}\n${spirit.description.substring(0, 50)}...`,
                inline: false
            });
        });

        if (userSpirits.length < 2) {
            embed.addFields({
                name: '💡 Thông tin',
                value: `Bạn có thể thức tỉnh thêm ${2 - userSpirits.length} vũ hồn nữa. Lần thứ 2 cần "Tẩy lễ võ hồn".`,
                inline: false
            });
        }

        return embed;
    }

    static async showAllSpirits(page = 1) {
        try {
            const limit = 5;
            const { spirits, page: currentPage, totalPages, total } = await SpiritService.getAllSpirits(page, limit);

            if (spirits.length === 0) {
                return new EmbedBuilder()
                    .setTitle('📚 Danh Sách Vũ Hồn')
                    .setDescription('❌ Hiện không có Vũ Hồn nào trong database!')
                    .setColor(0xFF0000);
            }

            const embed = new EmbedBuilder()
                .setTitle('📚 Danh Sách Tất Cả Vũ Hồn')
                .setDescription(`**Tổng số:** ${total} Vũ Hồn • **Trang:** ${currentPage}/${totalPages}\n\nDưới đây là danh sách các Vũ Hồn hiện có:`)
                .setColor(this.getRarityColor(spirits[0].rarity))
                .setFooter({
                    text: totalPages > 1 ?
                        `Sử dụng /spirit <trang> để xem trang khác • Trang ${currentPage}/${totalPages}` :
                        `Sử dụng /spirit <tên> để xem chi tiết`
                })
                .setTimestamp();

            spirits.forEach((spirit, index) => {
                const position = (page - 1) * limit + index + 1;
                const evolutionInfo = spirit.nextId ? '🔄' : '⏹️';

                embed.addFields({
                    name: `${this.getRarityEmoji(spirit.rarity)} ${position}.${spirit.icon} ${spirit.name} ${evolutionInfo}`,
                    value: `⚔️${spirit.atk} 🛡️${spirit.def} ⚡${spirit.sp} • **${spirit.rarity}**\n${spirit.description.substring(0, 80)}...`,
                    inline: false
                });
            });

            return embed;

        } catch (error) {
            console.error('❌ Lỗi khi hiển thị danh sách Vũ Hồn:', error);
            return new EmbedBuilder()
                .setTitle('❌ Lỗi')
                .setDescription('Đã xảy ra lỗi khi tải danh sách Vũ Hồn!')
                .setColor(0xFF0000);
        }
    }
    static async showAllSpiritsTable(page = 1) {
        try {
            const limit = 5;
            const { spirits, page: currentPage, totalPages, total } = await SpiritService.getAllSpirits(page, limit);

            if (spirits.length === 0) {
                return new EmbedBuilder()
                    .setTitle('📚 Danh Sách Vũ Hồn')
                    .setDescription('❌ Hiện không có Vũ Hồn nào trong database!')
                    .setColor(0xFF0000);
            }

            // Header bảng
            let table;
            table += `#  Icon   Tên                  ATK  DEF  SP   Rarity         Evo\n`;
            table += `---------------------------------------------------------------\n`;

            spirits.forEach((spirit, index) => {
                const position = (page - 1) * limit + index + 1;
                const evolutionInfo = spirit.nextId ? '🔄' : '⏹️';

                // Cột icon giữ cố định 5 ký tự, tên căn 20
                table += `${position.toString().padEnd(2)} `;
                table += `${spirit.icon.padEnd(6)} `;
                table += `${spirit.name.padEnd(20)} `;
                table += `${spirit.atk.toString().padEnd(4)}`;
                table += `${spirit.def.toString().padEnd(4)}`;
                table += `${spirit.sp.toString().padEnd(4)}`;
                table += `${spirit.rarity.padEnd(13)}`;
                table += `${evolutionInfo}\n`;
            });

            // table += "```";

            const embed = new EmbedBuilder()
                .setTitle('📚 Danh Sách Tất Cả Vũ Hồn (Bảng)')
                .setDescription(`**Tổng số:** ${total} Vũ Hồn • **Trang:** ${currentPage}/${totalPages}\n${table}`)
                .setColor(this.getRarityColor(spirits[0].rarity))
                .setFooter({
                    text: totalPages > 1 ?
                        `Sử dụng /spirit <trang> để xem trang khác • Trang ${currentPage}/${totalPages}` :
                        `Sử dụng /spirit <tên> để xem chi tiết`
                })
                .setTimestamp();

            return embed;

        } catch (error) {
            console.error('❌ Lỗi khi hiển thị bảng Vũ Hồn:', error);
            return new EmbedBuilder()
                .setTitle('❌ Lỗi')
                .setDescription('Đã xảy ra lỗi khi tải danh sách Vũ Hồn (bảng)!')
                .setColor(0xFF0000);
        }
    }


    // Hàm lấy emoji theo độ hiếm
    static getRarityEmoji(rarity) {
        const emojiMap = {
            [ITEM_RARITY.C]: '⚪',   // Common
            [ITEM_RARITY.SM]: '🔵',  // Semi-Mythic
            [ITEM_RARITY.R]: '🟢',   // Rare
            [ITEM_RARITY.SR]: '🔴',  // Super Rare
            [ITEM_RARITY.E]: '🟣',   // Epic
            [ITEM_RARITY.SE]: '🟠',  // Super Epic
            [ITEM_RARITY.L]: '🟡',   // Legendary
            [ITEM_RARITY.SL]: '🟤',  // Super Legendary
            [ITEM_RARITY.MY]: '✨',  // Mythic
            [ITEM_RARITY.SMY]: '🌟'  // Super Mythic
        };
        return emojiMap[rarity] || '⚪';
    }

    // Hàm lấy màu theo độ hiếm
    static getRarityColor(rarity) {
        const colorMap = {
            [ITEM_RARITY.C]: 0x888888,   // Gray
            [ITEM_RARITY.SM]: 0x0000FF,  // Blue
            [ITEM_RARITY.R]: 0x00FF00,   // Green
            [ITEM_RARITY.SR]: 0xFF0000,  // Red
            [ITEM_RARITY.E]: 0x800080,   // Purple
            [ITEM_RARITY.SE]: 0xFFA500,  // Orange
            [ITEM_RARITY.L]: 0xFFFF00,   // Yellow
            [ITEM_RARITY.SL]: 0x964B00,  // Brown
            [ITEM_RARITY.MY]: 0xFFD700,  // Gold
            [ITEM_RARITY.SMY]: 0xE6E6FA  // Lavender
        };
        return colorMap[rarity] || 0x0099FF;
    }
    static async addSpirit() {
        try {
            const spiritData = {
                name: "Tà Mâu Bạch Hổ",
                description: "Vũ Hồn thiên phú của Đới Mộc Bạch. Là thú vũ hồn hệ cường công. Có tiềm năng trở thành Vũ Hồn mạnh nhất.",
                imgUrl: "https://i.ibb.co/XxjTqtJ3/BachHo.png",
                atk: 90,
                def: 78,
                sp: 56
            };

            // Tìm hoặc tạo mới
            const spirit = await Spirit.findOneAndUpdate(
                { name: "Nhu Cốt Thỏ" }, // Điều kiện tìm
                spiritData, // Dữ liệu cập nhật
                {
                    upsert: true, // Nếu không tìm thấy thì tạo mới
                    new: true, // Trả về document sau khi update
                    runValidators: true // Chạy validation
                }
            );
            const spiritData1 = {
                name: "Nhu Cốt Thỏ",
                description: "Vũ Hồn thiên phú của Tiểu Vũ. Là thú vũ hồn hệ mẫn công. Có tiềm năng trở thành Vũ Hồn mạnh nhất.",
                imgUrl: "https://i.ibb.co/XxjTqtJ3/BachHo.png",
                atk: 85,
                def: 56,
                sp: 95
            };

            // Tìm hoặc tạo mới
            const spirit1 = await Spirit.findOneAndUpdate(
                { name: "Nhu Cốt Thỏ" }, // Điều kiện tìm
                spiritData1, // Dữ liệu cập nhật
                {
                    upsert: true, // Nếu không tìm thấy thì tạo mới
                    new: true, // Trả về document sau khi update
                    runValidators: true // Chạy validation
                }
            );

            const spiritData2 = {
                name: "Tà Hỏa Phượng Hoàng",
                description: "Vũ Hồn thiên phú của Mã Hồng Tuấn. Là thú vũ hồn hệ cường công. Có tiềm năng trở thành Vũ Hồn mạnh nhất.",
                imgUrl: "https://i.ibb.co/XxjTqtJ3/BachHo.png",
                atk: 95,
                def: 87,
                sp: 78
            };

            // Tìm hoặc tạo mới
            const spirit2 = await Spirit.findOneAndUpdate(
                { name: "Tà Hỏa Phượng Hoàng" }, // Điều kiện tìm
                spiritData2, // Dữ liệu cập nhật
                {
                    upsert: true, // Nếu không tìm thấy thì tạo mới
                    new: true, // Trả về document sau khi update
                    runValidators: true // Chạy validation
                }
            );
            const spiritData3 = {
                name: "La Tam Pháo",
                description: "Vũ Hồn thiên phú của Lão Sư. Là thú vũ hồn biến dị từ Lam Điện Bá Vương Long. Có tiềm năng trở thành Vũ Hồn mạnh nhất.",
                imgUrl: "https://i.ibb.co/C3kXGWbv/La-Tam-Phao.png",
                atk: 65,
                def: 56,
                sp: 56
            };

            // Tìm hoặc tạo mới
            const spirit3 = await Spirit.findOneAndUpdate(
                { name: "La Tam Pháo" }, // Điều kiện tìm
                spiritData3, // Dữ liệu cập nhật
                {
                    upsert: true, // Nếu không tìm thấy thì tạo mới
                    new: true, // Trả về document sau khi update
                    runValidators: true // Chạy validation
                }
            );

            const spiritData4 = {
                name: "U Minh Linh Miêu",
                description: "Vũ Hồn thiên phú của Chu Trúc Thanh. Là thú vũ hồn hệ mẫn công. Có tiềm năng trở thành Vũ Hồn mạnh nhất.",
                imgUrl: "https://i.ibb.co/s8m84d1/UMinh-Linh-Mieu.png",
                atk: 78,
                def: 67,
                sp: 89
            };

            // Tìm hoặc tạo mới
            const spirit4 = await Spirit.findOneAndUpdate(
                { name: "U Minh Linh Miêu" }, // Điều kiện tìm
                spiritData4, // Dữ liệu cập nhật
                {
                    upsert: true, // Nếu không tìm thấy thì tạo mới
                    new: true, // Trả về document sau khi update
                    runValidators: true // Chạy validation
                }
            );
            const spiritData5 = {
                name: "Hạo Thiên Chùy",
                description: "Vũ Hồn thiên phú của Hạo Thiên Tông. Là thú vũ hồn hệ cường công. Có tiềm năng trở thành Vũ Hồn mạnh nhất.",
                imgUrl: "https://i.ibb.co/hRcjzSRc/Hao-Thien-Chuy.png",
                atk: 99,
                def: 89,
                sp: 78
            };

            // Tìm hoặc tạo mới
            const spirit5 = await Spirit.findOneAndUpdate(
                { name: "Hạo Thiên Chùy" }, // Điều kiện tìm
                spiritData5, // Dữ liệu cập nhật
                {
                    upsert: true, // Nếu không tìm thấy thì tạo mới
                    new: true, // Trả về document sau khi update
                    runValidators: true // Chạy validation
                }
            );
            // console.log('✅ Lam Ngân Thảo Hoàng đã được import thành công:', spirit);
            console.log(spirit1)
            console.log(spirit2)
            console.log(spirit3)
            console.log(spirit4)
            console.log(spirit5)

            return spirit;

        } catch (error) {
            console.error('❌ Lỗi khi import Lam Ngân Thảo Hoàng:', error);
            throw error;
        }
    }
}

module.exports = SpiritController;