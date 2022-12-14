const { User, Comment, Recomment } = require('../models');
const ErrorCustom = require('../advice/errorCustom');
const admin = require('firebase-admin');

class RecommentService {
    createRecomment = async(userKey, commentKey, comment, nickname) => {
          const data = await Comment.findOne({
            where: { commentKey },
            include: [{ model: User, attributes: ['deviceToken'] }],
          });
      
          if (!data) {
            throw new ErrorCustom(400, '해당 댓글이 존재하지 않습니다.');
          }

          const createRecomment = await Recomment.create({
            commentKey,
            comment,
            userKey,
            nickname,
          });

          

          const findRecomment = await Recomment.findOne({
            where: { commentKey: createRecomment.commentKey },
            include: [{ model: User, attributes: ['nickname', 'point'] }],
          });
      
          if (data.User.deviceToken) {
            let target_token = data.User.deviceToken;
      
            const message = {
              token: target_token,
              data: {
                title: '곰곰',
                body: '작성한 댓글에 대댓글이 달렸습니다!',
                link: `detail/${data.selectKey}`,
              },
            };
      
            admin
              .messaging()
              .send(message)
              .catch(function (err) {
                next(err);
              });
          }
      
          return { 
            ok: true,
            msg: '대댓글 작성  성공',
              result: {
                commentKey,
                recommentKey: createRecomment.recommentKey,
                comment,
                userKey,
                User: {
                  nickname,
                  point: findRecomment.User.point,
                },
                updatedAt: findRecomment.updatedAt,
              }
          }
    }

    putRecomments = async(userKey, recommentKey, comment, nickname) => {
        const data = await Recomment.findOne({
            where: { recommentKey },
          });
      
          if (!data) {
            throw new ErrorCustom(400, '해당 대댓글이 존재하지 않습니다.');
          }
      
          if (userKey !== data.userKey) {
            throw new ErrorCustom(400, '작성자가 다릅니다.');
          } else {
            await Recomment.update({ comment }, { where: { recommentKey, userKey } });
       
            const updateCmt = await Recomment.findOne({
              where: { recommentKey },
              include: [{ model: User, attributes: ['nickname', 'point'] }],
            });
      
            return {
              ok: true,
              msg: '대댓글 수정 성공',
              result: {
                commentKey: updateCmt.commentKey,
                recommentKey,
                comment,
                User: {
                  nickname,
                  point: updateCmt.User.point,
                },
                userKey,
                updatedAt: updateCmt.updatedAt,
              },
            };
          }
    }

    deleteRecomments = async(userKey, recommentKey, nickname) => {
        const data = await Recomment.findOne({ where: { recommentKey } });
        
        if (!data) {
          throw new ErrorCustom(400, '해당 대댓글이 존재하지 않습니다.');
        }
    
        if (userKey !== data.userKey) {
          throw new ErrorCustom(400, '작성자가 다릅니다.');
        } else {
          await Recomment.destroy({ where: { recommentKey, userKey } });
    
          return {
            ok: true,
            msg: '대댓글 삭제 성공',
            result: {
              commentKey: data.commentKey,
              recommentKey: data.recommentKey,
              comment: data.comment,
              nickname: nickname,
              userKey,
            },
          };
        }
    }
}





module.exports = RecommentService;