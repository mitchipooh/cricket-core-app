
import React, { useState } from 'react';
import { MediaPost, UserProfile } from '../../types.ts';

interface NewsFeedProps {
    posts: MediaPost[];
    onAddPost: (post: MediaPost) => void;
    onDeletePost?: (postId: string) => void;
    isAdmin: boolean;
    currentUser?: UserProfile | null;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ posts, onAddPost, onDeletePost, isAdmin, currentUser }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [articleTitle, setArticleTitle] = useState('');
    const [articleBody, setArticleBody] = useState('');

    // Filter ONLY news posts for this view
    const newsPosts = posts.filter(p => p.type === 'NEWS').sort((a, b) => b.timestamp - a.timestamp);

    const handlePublish = () => {
        if (!articleTitle.trim() || !articleBody.trim() || !currentUser) return;

        const newArticle: MediaPost = {
            id: `news-${Date.now()}`,
            type: 'NEWS',
            authorName: currentUser.name,
            authorAvatar: currentUser.avatarUrl,
            title: articleTitle,
            caption: articleBody,
            timestamp: Date.now(),
            likes: [],
            dislikes: [],
            shares: 0,
            comments: []
        };

        onAddPost(newArticle);
        setIsCreating(false);
        setArticleTitle('');
        setArticleBody('');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in">
            <div className="flex justify-between items-center px-4">
                <h2 className="text-xl font-serif font-black text-slate-900 uppercase tracking-widest border-b-4 border-slate-900 pb-1">
                    Official News Board
                </h2>
                {isAdmin && !isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 shadow-lg transition-all"
                    >
                        + Write Article
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200 animate-in zoom-in-95">
                    <h3 className="text-lg font-black text-slate-900 mb-6">Draft New Article</h3>
                    <div className="space-y-4">
                        <input
                            value={articleTitle}
                            onChange={e => setArticleTitle(e.target.value)}
                            placeholder="Headline..."
                            className="w-full text-2xl font-serif font-black bg-slate-50 border-none outline-none p-4 rounded-xl placeholder:text-slate-300"
                            autoFocus
                        />
                        <textarea
                            value={articleBody}
                            onChange={e => setArticleBody(e.target.value)}
                            placeholder="Article content..."
                            rows={8}
                            className="w-full bg-slate-50 border-none outline-none p-4 rounded-xl resize-none font-medium text-slate-700 placeholder:text-slate-300"
                        />
                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setIsCreating(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-xs hover:bg-slate-50 rounded-xl">Cancel</button>
                            <button onClick={handlePublish} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs hover:bg-indigo-500 shadow-lg">Publish Article</button>
                        </div>
                    </div>
                </div>
            )}

            {newsPosts.length === 0 && !isCreating ? (
                <div className="text-center py-20 opacity-40">
                    <span className="text-6xl block mb-4">📰</span>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">No official news yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {newsPosts.map(post => (
                        <article key={post.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group relative">
                            {isAdmin && onDeletePost && (
                                <button
                                    onClick={() => { if (confirm('Delete article?')) onDeletePost(post.id); }}
                                    className="absolute top-6 right-6 text-slate-300 hover:text-red-500 font-bold z-10"
                                >
                                    ✕
                                </button>
                            )}
                            <div className="mb-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black">
                                    {post.authorName.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-900">{post.authorName}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(post.timestamp).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <h3 className="text-2xl font-serif font-black text-slate-900 mb-4 leading-tight group-hover:text-indigo-700 transition-colors">
                                {post.title}
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                                {post.caption}
                            </p>
                            <button className="mt-6 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700">Read Full Story →</button>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

