/**
 * 朋友圈服务单元测试
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const SocialPost = require('../../src/models/SocialPost');
const Comment = require('../../src/models/Comment');
const SocialFollow = require('../../src/models/SocialFollow');
const SocialTopic = require('../../src/models/SocialTopic');

describe('SocialPost Model', () => {
  let mongoServer;
  let userId;
  let villageId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // 创建测试用户和村庄ID
    userId = new mongoose.Types.ObjectId();
    villageId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await SocialPost.deleteMany({});
    await Comment.deleteMany({});
  });

  describe('创建动态', () => {
    test('应成功创建文本动态', async () => {
      const post = new SocialPost({
        villageId,
        author: userId,
        postType: 'text',
        content: {
          text: '今天天气真好！'
        },
        status: 'published'
      });

      await post.save();

      expect(post._id).toBeDefined();
      expect(post.content.text).toBe('今天天气真好！');
      expect(post.interactions.likes).toBe(0);
    });

    test('应成功创建图文动态', async () => {
      const post = new SocialPost({
        villageId,
        author: userId,
        postType: 'image',
        content: {
          text: '美丽的乡村风景',
          images: [
            {
              url: '/uploads/images/img1.jpg',
              thumbnail: '/uploads/thumbnails/thumb1.jpg',
              width: 1920,
              height: 1080,
              size: 524288
            }
          ]
        },
        status: 'published'
      });

      await post.save();

      expect(post.content.images).toHaveLength(1);
      expect(post.content.images[0].url).toBe('/uploads/images/img1.jpg');
    });

    test('应自动设置默认值', async () => {
      const post = new SocialPost({
        villageId,
        author: userId,
        postType: 'text',
        content: { text: '测试' }
      });

      await post.save();

      expect(post.status).toBe('published');
      expect(post.category).toBe('daily');
      expect(post.visibility).toBe('public');
      expect(post.moderation.status).toBe('approved');
    });
  });

  describe('互动计数', () => {
    test('应正确增加点赞数', async () => {
      const post = new SocialPost({
        villageId,
        author: userId,
        postType: 'text',
        content: { text: '测试' }
      });

      await post.save();
      await post.incrementInteraction('likes');
      await post.incrementInteraction('likes');

      const updated = await SocialPost.findById(post._id);
      expect(updated.interactions.likes).toBe(2);
    });

    test('应正确减少点赞数', async () => {
      const post = new SocialPost({
        villageId,
        author: userId,
        postType: 'text',
        content: { text: '测试' },
        'interactions.likes': 5
      });

      await post.save();
      await post.decrementInteraction('likes');

      const updated = await SocialPost.findById(post._id);
      expect(updated.interactions.likes).toBe(4);
    });

    test('应正确增加浏览量', async () => {
      const post = new SocialPost({
        villageId,
        author: userId,
        postType: 'text',
        content: { text: '测试' }
      });

      await post.save();
      await post.incrementView();
      await post.incrementView();

      const updated = await SocialPost.findById(post._id);
      expect(updated.interactions.views).toBe(2);
    });
  });

  describe('标签管理', () => {
    test('应成功添加标签', async () => {
      const post = new SocialPost({
        villageId,
        author: userId,
        postType: 'text',
        content: { text: '测试' },
        tags: []
      });

      await post.save();
      await post.addTag('乡村生活');
      await post.addTag('农业');

      const updated = await SocialPost.findById(post._id);
      expect(updated.tags).toHaveLength(2);
      expect(updated.tags).toContain('乡村生活');
    });

    test('不应添加重复标签', async () => {
      const post = new SocialPost({
        villageId,
        author: userId,
        postType: 'text',
        content: { text: '测试' },
        tags: []
      });

      await post.save();
      await post.addTag('乡村生活');
      await post.addTag('乡村生活');

      const updated = await SocialPost.findById(post._id);
      expect(updated.tags).toHaveLength(1);
    });

    test('应自动转小写', async () => {
      const post = new SocialPost({
        villageId,
        author: userId,
        postType: 'text',
        content: { text: '测试' },
        tags: []
      });

      await post.save();
      await post.addTag('RURAL_LIFE');

      const updated = await SocialPost.findById(post._id);
      expect(updated.tags[0]).toBe('rural_life');
    });
  });

  describe('虚拟字段', () => {
    test('应正确计算互动率', async () => {
      const post = new SocialPost({
        villageId,
        author: userId,
        postType: 'text',
        content: { text: '测试' },
        interactions: {
          likes: 10,
          comments: 5,
          shares: 2,
          views: 100
        }
      });

      await post.save();
      const json = post.toJSON();

      expect(parseFloat(json.engagementRate)).toBeCloseTo(17.0, 0);
    });

    test('浏览量为0时应返回0', async () => {
      const post = new SocialPost({
        villageId,
        author: userId,
        postType: 'text',
        content: { text: '测试' },
        interactions: {
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0
        }
      });

      await post.save();
      const json = post.toJSON();

      expect(json.engagementRate).toBe('0.00');
    });
  });

  describe('查询功能', () => {
    beforeEach(async () => {
      // 创建测试数据
      await SocialPost.create([
        {
          villageId,
          author: userId,
          postType: 'text',
          content: { text: '农业技术' },
          category: 'agriculture',
          tags: ['水稻', '种植'],
          status: 'published'
        },
        {
          villageId,
          author: userId,
          postType: 'image',
          content: { text: '乡村风景', images: [] },
          category: 'daily',
          tags: ['风景'],
          status: 'published'
        },
        {
          villageId,
          author: userId,
          postType: 'text',
          content: { text: '草稿' },
          category: 'daily',
          status: 'draft'
        }
      ]);
    });

    test('应按类别查询', async () => {
      const agriculturePosts = await SocialPost.find({ category: 'agriculture' });
      expect(agriculturePosts).toHaveLength(1);
      expect(agriculturePosts[0].category).toBe('agriculture');
    });

    test('应按标签查询', async () => {
      const posts = await SocialPost.find({ tags: '水稻' });
      expect(posts).toHaveLength(1);
    });

    test('应只查询已发布动态', async () => {
      const publishedPosts = await SocialPost.find({ status: 'published' });
      expect(publishedPosts).toHaveLength(2);
    });

    test('应按创建时间排序', async () => {
      const posts = await SocialPost.find({ status: 'published' })
        .sort({ createdAt: -1 });

      expect(posts.length).toBeGreaterThan(0);
    });
  });
});

describe('Comment Model', () => {
  let mongoServer;
  let userId;
  let postId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    userId = new mongoose.Types.ObjectId();
    postId = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Comment.deleteMany({});
  });

  describe('评论管理', () => {
    test('应成功创建评论', async () => {
      const comment = new Comment({
        postId,
        author: userId,
        content: '很棒的分享！'
      });

      await comment.save();

      expect(comment._id).toBeDefined();
      expect(comment.content).toBe('很棒的分享！');
      expect(comment.status).toBe('active');
    });

    test('应支持楼中楼回复', async () => {
      const parentComment = new Comment({
        postId,
        author: userId,
        content: '父评论'
      });

      await parentComment.save();

      const replyComment = new Comment({
        postId,
        author: userId,
        content: '回复评论',
        parentComment: parentComment._id,
        replyToUser: userId
      });

      await replyComment.save();

      expect(replyComment.parentComment).toEqual(parentComment._id);

      const replies = await parentComment.getReplies();
      expect(replies).toHaveLength(1);
    });

    test('应正确管理点赞', async () => {
      const comment = new Comment({
        postId,
        author: userId,
        content: '测试评论'
      });

      await comment.save();
      await comment.addLike(userId);
      await comment.addLike(userId);

      expect(comment.likesCount).toBe(1);

      await comment.removeLike(userId);
      expect(comment.likesCount).toBe(0);
    });

    test('应支持表情反应', async () => {
      const comment = new Comment({
        postId,
        author: userId,
        content: '测试评论'
      });

      await comment.save();
      await comment.addReaction(userId, 'love');

      expect(comment.reactions).toHaveLength(1);
      expect(comment.reactions[0].type).toBe('love');
    });
  });

  describe('级联删除', () => {
    test('删除评论时应删除所有子评论', async () => {
      const parentComment = new Comment({
        postId,
        author: userId,
        content: '父评论'
      });

      await parentComment.save();

      const childComment = new Comment({
        postId,
        author: userId,
        content: '子评论',
        parentComment: parentComment._id
      });

      await childComment.save();

      await parentComment.deleteOne();

      const remaining = await Comment.countDocuments();
      expect(remaining).toBe(0);
    });
  });
});

describe('SocialFollow Model', () => {
  let mongoServer;
  let user1, user2;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    user1 = new mongoose.Types.ObjectId();
    user2 = new mongoose.Types.ObjectId();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await SocialFollow.deleteMany({});
  });

  describe('关注功能', () => {
    test('应成功创建关注关系', async () => {
      const follow = new SocialFollow({
        follower: user1,
        following: user2,
        relationType: 'follow'
      });

      await follow.save();

      expect(follow._id).toBeDefined();
      expect(follow.relationType).toBe('follow');
    });

    test('应禁止自己关注自己', async () => {
      const follow = new SocialFollow({
        follower: user1,
        following: user1,
        relationType: 'follow'
      });

      await expect(follow.save()).rejects.toThrow('不能关注自己');
    });

    test('应检查重复关注', async () => {
      await SocialFollow.create({
        follower: user1,
        following: user2,
        relationType: 'follow'
      });

      const exists = await SocialFollow.isFollowing(user1, user2);
      expect(exists).toBeDefined();
    });

    test('应正确获取关注列表', async () => {
      await SocialFollow.create({
        follower: user1,
        following: user2,
        relationType: 'follow'
      });

      const following = await SocialFollow.getFollowing(user1);
      expect(following).toHaveLength(1);
    });

    test('应正确获取粉丝列表', async () => {
      await SocialFollow.create({
        follower: user1,
        following: user2,
        relationType: 'follow'
      });

      const followers = await SocialFollow.getFollowers(user2);
      expect(followers).toHaveLength(1);
    });
  });

  describe('亲密度计算', () => {
    test('应正确更新亲密度', async () => {
      await SocialFollow.create({
        follower: user1,
        following: user2,
        relationType: 'follow'
      });

      await SocialFollow.updateCloseness(user1, user2, 10);

      const follow = await SocialFollow.findOne({
        follower: user1,
        following: user2
      });

      expect(follow.closenessScore).toBe(10);
      expect(follow.interactionCount).toBe(1);
    });

    test('亲密度应不超过100', async () => {
      await SocialFollow.create({
        follower: user1,
        following: user2,
        relationType: 'follow',
        closenessScore: 95
      });

      await SocialFollow.updateCloseness(user1, user2, 20);

      const follow = await SocialFollow.findOne({
        follower: user1,
        following: user2
      });

      expect(follow.closenessScore).toBe(100);
    });
  });
});

describe('SocialTopic Model', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await SocialTopic.deleteMany({});
  });

  describe('话题管理', () => {
    test('应成功创建话题', async () => {
      const topic = new SocialTopic({
        name: '春耕备耕',
        description: '春耕备耕相关讨论',
        category: 'agriculture'
      });

      await topic.save();

      expect(topic._id).toBeDefined();
      expect(topic.slug).toBe('春耕备耕');
      expect(topic.status).toBe('active');
    });

    test('应自动生成slug', async () => {
      const topic = new SocialTopic({
        name: '乡村生活'
      });

      await topic.save();

      expect(topic.slug).toBe('乡村生活');
    });

    test('应正确增加帖子数', async () => {
      const topic = new SocialTopic({
        name: '农业技术'
      });

      await topic.save();
      await topic.incrementPosts();

      const updated = await SocialTopic.findById(topic._id);
      expect(updated.postsCount).toBe(1);
    });

    test('应正确更新热度分数', async () => {
      const topic = new SocialTopic({
        name: '热门话题',
        postsCount: 50,
        participantsCount: 20
      });

      await topic.save();
      const score = topic.updateTrendingScore();

      expect(score).toBeGreaterThan(0);
    });

    test('高热度应设为热门', async () => {
      const topic = new SocialTopic({
        name: '热门话题',
        postsCount: 100,
        participantsCount: 50
      });

      await topic.save();
      topic.updateTrendingScore();
      await topic.save();

      expect(topic.hot).toBe(true);
    });
  });
});
