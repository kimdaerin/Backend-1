const { Select, User, Comment, Recomment } = require('../models');
const ErrorCustom = require('../advice/errorCustom');
const admin = require('firebase-admin');

class CommentService {
    createComment = async (comment, selectKey, userKey, nickname) => {
        const data = await Select.findOne({
            where: { selectKey },
            include: [{ model: User, attributes: ['deviceToken'] }],
          });
      
          if (!data) {
            throw new ErrorCustom(400, '해당 선택글이 존재하지 않습니다.');
          }
      
          const createComment = await Comment.create({
            comment, 
            selectKey,
            userKey,
            nickname,
          });

          const findComment = await Comment.findOne({
            where: { commentKey: createComment.commentKey },
            include: [{ model: User, attributes: ['nickname', 'point'] }],
          });


          // 글쓴이 토큰 유무 확인 후 알림 보내주기
          if (data.User.deviceToken) {
            let target_token = data.User.deviceToken;
      
            const message = {
              token: target_token,
              data: {
                title: '곰곰',
                body: '게시물에 댓글이 달렸습니다!',
                link: `detail/${selectKey}`,
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
            msg: '댓글 작성 성공',
            result: {
              commentKey: createComment.commentKey,
              comment: createComment.comment,
              nickname: nickname,
              userKey,
              point: findComment.User.point,
              updatedAt: findComment.updatedAt,
            }
          }


    }

    allComment = async(selectKey) => {
      const data = await Select.findOne({
        where: { selectKey },
      });
  
      if (!data) {
        throw new ErrorCustom(400, '해당 선택글이 존재하지 않습니다.');
      }

      const datas = await Comment.findAll({
        where: { selectKey },
        include: [
          { model: User, attributes: ['nickname', 'point'] },
          {
            model: Recomment,
            include: [{ model: User, attributes: ['nickname', 'point'] }],
          },
        ],
        order: [['commentKey', 'ASC']],
      });

      return {
        ok: true,
        msg: '대댓글 조회 성공',
        result: datas.map((e) => {
          return {
            commentKey: e.commentKey,
            comment: e.comment,
            nickname: e.User.nickname,
            userKey: e.userKey,
            point: e.User.point,
            updatedAt: e.updatedAt,
            recomment: e.Recomments,
          };
        }),
      }
    }

    putComments = async(userKey, commentKey, comment, nickname)=> {  
      const data = await Comment.findOne({
        where: { commentKey },
      });
  
      if (!data) {
        throw new ErrorCustom(400, '해당 댓글이 존재하지 않습니다.');
      }
  
      if (userKey !== data.userKey) {
        throw new ErrorCustom(400, '작성자가 다릅니다.');
      } else {
        const updateComment = await Comment.update(
          { comment },
          { where: { commentKey } }
        );
  
        const updateCmt = await Comment.findOne({
          where: { commentKey },
          include: [{ model: User, attributes: ['nickname', 'point'] }],
        });

        return {
          ok: true,
          msg: '댓글 수정 성공',
          result: {
            commentKey,
            comment: updateComment.comment,
            nickname: nickname,
            userKey,
            point: updateCmt.User.point,
            updatedAt: updateCmt.updatedAt,
          },
        };
    }
  }

    deleteComments = async (userKey, commentKey, nickname) => {
      const data = await Comment.findOne({ where: { commentKey } });
        
      if (!data) {
        throw new ErrorCustom(400, '해당 댓글이 존재하지 않습니다.');
      }
  
      if (userKey !== data.userKey) {
        throw new ErrorCustom(400, '작성자가 다릅니다.');
      } else {
        await Comment.destroy({ where: { commentKey, userKey } });
  
        return {
          ok: true,
          msg: '댓글 삭제 성공',
          result: {
            commentKey: data.commentKey,
            comment: data.comment,
            nickname: nickname,
            userKey,
          },
        };
    }
  }
}

module.exports = CommentService;