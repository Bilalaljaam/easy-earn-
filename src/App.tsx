/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ReactNode } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  signInAnonymously,
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { 
  LayoutDashboard,
  Play, 
  Wallet, 
  History, 
  LogOut, 
  Coins, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Smartphone,
  Trophy,
  ChevronRight,
  Gamepad2,
  ClipboardList,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { UserProfile, Video, Withdrawal, Game, Survey } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Constants
const POINTS_PER_DOLLAR = 1000;
const DEFAULT_WISH_NUMBER = "81322607";

// Mock Videos (In a real app, these would be in Firestore)
const SAMPLE_VIDEOS: Video[] = [
  {
    id: 'v1',
    title: 'Nature Relaxation: Forest Stream',
    thumbnail: 'https://picsum.photos/seed/forest/400/225',
    duration: '0:30',
    pointsReward: 50,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
  },
  {
    id: 'v2',
    title: 'Urban Exploration: Tokyo Lights',
    thumbnail: 'https://picsum.photos/seed/tokyo/400/225',
    duration: '0:45',
    pointsReward: 75,
    videoUrl: 'https://www.w3schools.com/html/movie.mp4'
  },
  {
    id: 'v3',
    title: 'Cooking Masterclass: Perfect Pasta',
    thumbnail: 'https://picsum.photos/seed/pasta/400/225',
    duration: '1:00',
    pointsReward: 100,
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
  },
  {
    id: 'v4',
    title: 'Tech Review: Future Gadgets',
    thumbnail: 'https://picsum.photos/seed/tech/400/225',
    duration: '0:30',
    pointsReward: 50,
    videoUrl: 'https://www.w3schools.com/html/movie.mp4'
  }
];

const SAMPLE_GAMES: Game[] = [
  {
    id: 'g1',
    title: 'Space Invaders',
    thumbnail: 'https://picsum.photos/seed/space/400/225',
    pointsReward: 200,
    gameUrl: '#',
    category: 'Arcade'
  },
  {
    id: 'g2',
    title: 'Puzzle Master',
    thumbnail: 'https://picsum.photos/seed/puzzle/400/225',
    pointsReward: 150,
    gameUrl: '#',
    category: 'Logic'
  },
  {
    id: 'g3',
    title: 'Speed Racer',
    thumbnail: 'https://picsum.photos/seed/race/400/225',
    pointsReward: 300,
    gameUrl: '#',
    category: 'Racing'
  }
];

const SAMPLE_SURVEYS: Survey[] = [
  {
    id: 's1',
    title: 'Consumer Habits 2024',
    description: 'Tell us about your shopping preferences.',
    pointsReward: 500,
    estimatedTime: '5 min',
    questions: 10
  },
  {
    id: 's2',
    title: 'Tech Trends Survey',
    description: 'What gadgets are you planning to buy?',
    pointsReward: 750,
    estimatedTime: '8 min',
    questions: 15
  },
  {
    id: 's3',
    title: 'Travel Preferences',
    description: 'Where is your next dream destination?',
    pointsReward: 400,
    estimatedTime: '4 min',
    questions: 8
  }
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="text-red-500 w-16 h-16 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6 max-w-md">
            We encountered an error. Please try refreshing the page.
          </p>
          <pre className="bg-gray-100 p-4 rounded-lg text-xs text-left overflow-auto max-w-full mb-6">
            {this.state.errorInfo}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold"
          >
            Refresh App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <GreenRewardsApp />
    </ErrorBoundary>
  );
}

function GreenRewardsApp() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'earn' | 'dashboard' | 'withdraw' | 'history'>('earn');
  const [earnTab, setEarnTab] = useState<'videos' | 'games' | 'surveys'>('videos');
  const [watchingVideo, setWatchingVideo] = useState<Video | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const [surveyStep, setSurveyStep] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [wishNumber, setWishNumber] = useState(DEFAULT_WISH_NUMBER);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false);

        // Fetch profile in background
        const userDoc = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userDoc);
        
        if (!userSnap.exists()) {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || 'guest@greenrewards.app',
            points: 0,
            totalEarned: 0,
            wishNumber: DEFAULT_WISH_NUMBER
          };
          try {
            await setDoc(userDoc, newProfile);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `users/${firebaseUser.uid}`);
          }
          setProfile(newProfile);
        } else {
          setProfile(userSnap.data() as UserProfile);
        }

        // Listen for real-time profile updates
        onSnapshot(userDoc, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          }
        }, (e) => handleFirestoreError(e, OperationType.GET, `users/${firebaseUser.uid}`));

        // Listen for withdrawals
        const q = query(
          collection(db, 'withdrawals'),
          where('userId', '==', firebaseUser.uid),
          orderBy('timestamp', 'desc')
        );
        onSnapshot(q, (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Withdrawal));
          setWithdrawals(list);
        }, (e) => handleFirestoreError(e, OperationType.LIST, 'withdrawals'));
      } else {
        // Auto-login anonymously for direct access
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous login failed", error);
          setLoading(false);
        }
      }
    }, (e) => {
      console.error("Auth error", e);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = () => {}; // No longer needed but kept for compatibility

  const handleLogout = () => signOut(auth);

  const startWatching = (video: Video) => {
    setWatchingVideo(video);
    setWatchProgress(0);
    
    // Simulate watching progress
    const interval = setInterval(() => {
      setWatchProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 1000);
  };

  const completeWatch = async () => {
    if (!watchingVideo || !profile || !user) return;
    await addPoints(watchingVideo.pointsReward, `Earned ${watchingVideo.pointsReward} points from video!`);
    setWatchingVideo(null);
  };

  const startTask = (type: 'game' | 'survey', item: any) => {
    setIsTaskLoading(true);
    if (type === 'game') setActiveGame(item);
    else setActiveSurvey(item);
    
    setTimeout(() => {
      setIsTaskLoading(false);
    }, 1500);
  };

  const completeGame = async () => {
    if (!activeGame) return;
    await addPoints(activeGame.pointsReward, `Great job! You earned ${activeGame.pointsReward} points!`);
    setActiveGame(null);
    setGameScore(0);
  };

  const completeSurvey = async () => {
    if (!activeSurvey) return;
    await addPoints(activeSurvey.pointsReward, `Survey complete! You earned ${activeSurvey.pointsReward} points!`);
    setActiveSurvey(null);
    setSurveyStep(0);
  };

  const addPoints = async (amount: number, successMessage: string) => {
    if (!profile || !user) return;
    try {
      const userDoc = doc(db, 'users', user.uid);
      await updateDoc(userDoc, {
        points: profile.points + amount,
        totalEarned: profile.totalEarned + amount
      });
      
      setMessage({ type: 'success', text: successMessage });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;

    const MIN_WITHDRAWAL = 1.0;
    const amount = parseFloat(withdrawAmount);
    const pointsNeeded = amount * POINTS_PER_DOLLAR;

    if (isNaN(amount) || amount < MIN_WITHDRAWAL) {
      setMessage({ type: 'error', text: `Minimum withdrawal is $${MIN_WITHDRAWAL.toFixed(2)}` });
      return;
    }

    if (profile.points < pointsNeeded) {
      setMessage({ type: 'error', text: "Insufficient points" });
      return;
    }

    try {
      // Create withdrawal request
      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        amount: amount,
        points: pointsNeeded,
        status: 'pending',
        wishNumber: wishNumber,
        timestamp: serverTimestamp()
      });

      // Deduct points
      const userDoc = doc(db, 'users', user.uid);
      await updateDoc(userDoc, {
        points: profile.points - pointsNeeded
      });

      setWithdrawAmount('');
      setMessage({ type: 'success', text: "Withdrawal request submitted to Wish Money!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'withdrawals');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0 md:pl-64">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <Play className="text-white w-6 h-6 fill-current" />
          </div>
          <span className="text-xl font-bold text-gray-900">GreenRewards</span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem 
            active={activeTab === 'earn'} 
            onClick={() => setActiveTab('earn')}
            icon={<Coins size={20} />}
            label="Earn Points"
          />
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label="My Dashboard"
          />
          <NavItem 
            active={activeTab === 'withdraw'} 
            onClick={() => setActiveTab('withdraw')}
            icon={<Wallet size={20} />}
            label="Withdraw Cash"
          />
          <NavItem 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
            icon={<History size={20} />}
            label="History"
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-blue-50">
              G
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">Guest User</p>
              <p className="text-xs text-gray-500 truncate">Anonymous Access</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {activeTab === 'earn' && "Earn Points"}
              {activeTab === 'dashboard' && "My Dashboard"}
              {activeTab === 'withdraw' && "Withdraw Cash"}
              {activeTab === 'history' && "Transaction History"}
            </h2>
            <p className="text-gray-500 text-sm">
              {activeTab === 'earn' && "Choose your favorite way to earn"}
              {activeTab === 'dashboard' && "Track your progress"}
              {activeTab === 'withdraw' && "Convert points to cash"}
              {activeTab === 'history' && "Your past activities"}
            </p>
          </div>
          <div className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
            <Coins size={18} className="fill-current" />
            <span className="font-bold">{profile?.points.toLocaleString() || 0}</span>
          </div>
        </header>

        {/* Notifications */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "mb-6 p-4 rounded-xl flex items-center gap-3",
                message.type === 'success' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}
            >
              {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span className="font-medium">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        {activeTab === 'earn' && (
          <div className="space-y-8">
            {/* Sub-tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
              <button 
                onClick={() => setEarnTab('videos')}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                  earnTab === 'videos' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Play size={16} /> Videos
              </button>
              <button 
                onClick={() => setEarnTab('games')}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                  earnTab === 'games' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Gamepad2 size={16} /> Games
              </button>
              <button 
                onClick={() => setEarnTab('surveys')}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                  earnTab === 'surveys' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <ClipboardList size={16} /> Surveys
              </button>
            </div>

            {earnTab === 'videos' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SAMPLE_VIDEOS.map((video) => (
                  <VideoCard 
                    key={video.id} 
                    video={video} 
                    onWatch={() => startWatching(video)} 
                  />
                ))}
              </div>
            )}

            {earnTab === 'games' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SAMPLE_GAMES.map((game) => (
                  <motion.div 
                    key={game.id}
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group"
                  >
                    <div className="relative aspect-square">
                      <img 
                        src={game.thumbnail} 
                        alt={game.title} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                        {game.category}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-gray-900 mb-3">{game.title}</h3>
                      <button 
                        onClick={() => startTask('game', game)}
                        className="w-full bg-gray-50 hover:bg-blue-600 hover:text-white text-blue-600 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        Play & Earn <Coins size={14} />
                      </button>
                      <p className="text-center text-[10px] text-gray-400 mt-2">Reward: {game.pointsReward} pts</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {earnTab === 'surveys' && (
              <div className="space-y-4">
                {SAMPLE_SURVEYS.map((survey) => (
                  <motion.div 
                    key={survey.id}
                    whileHover={{ x: 5 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                        <ClipboardList size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{survey.title}</h3>
                        <p className="text-gray-500 text-sm mt-1">{survey.description}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={12} /> {survey.estimatedTime}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <ClipboardList size={12} /> {survey.questions} Questions
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                        <p className="text-blue-600 font-bold">+{survey.pointsReward} pts</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Estimated Reward</p>
                      </div>
                      <button 
                        onClick={() => startTask('survey', survey)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-blue-100 transition-all text-sm whitespace-nowrap"
                      >
                        Start Survey
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard 
                label="Current Balance" 
                value={profile?.points.toLocaleString() || "0"} 
                subValue={`≈ $${((profile?.points || 0) / POINTS_PER_DOLLAR).toFixed(2)}`}
                icon={<Coins className="text-green-600" />}
              />
              <StatCard 
                label="Total Earned" 
                value={profile?.totalEarned.toLocaleString() || "0"} 
                subValue="All time earnings"
                icon={<Trophy className="text-yellow-500" />}
              />
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Conversion Rate</h3>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Coins className="text-green-600" size={20} />
                  </div>
                  <span className="font-semibold">{POINTS_PER_DOLLAR} Points</span>
                </div>
                <ArrowRight className="text-gray-400" />
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xl text-green-600">$1.00</span>
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <Wallet className="text-white" size={20} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'withdraw' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Wallet className="text-blue-600 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold">Withdraw to Wish Money</h3>
                <p className="text-gray-500 text-sm">Fast and secure cash transfer</p>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Withdrawal Amount ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                  {withdrawAmount && (
                    <p className="text-xs text-gray-500 mt-2">
                      Cost: <span className="font-bold text-blue-600">{(parseFloat(withdrawAmount) * POINTS_PER_DOLLAR).toLocaleString()}</span> points
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Wish Money Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="tel" 
                      value={wishNumber}
                      onChange={(e) => setWishNumber(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                >
                  Confirm Wish Withdrawal
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {withdrawals.length === 0 ? (
              <div className="p-12 text-center">
                <History className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500">No transactions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Wish Number</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {w.timestamp?.toDate().toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900">${w.amount.toFixed(2)}</span>
                          <p className="text-xs text-gray-400">{w.points.toLocaleString()} pts</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{w.wishNumber}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold",
                            w.status === 'pending' && "bg-yellow-100 text-yellow-700",
                            w.status === 'completed' && "bg-green-100 text-green-700",
                            w.status === 'rejected' && "bg-red-100 text-red-700"
                          )}>
                            {w.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center p-3 z-50">
        <MobileNavItem 
          active={activeTab === 'earn'} 
          onClick={() => setActiveTab('earn')}
          icon={<Coins size={24} />}
        />
        <MobileNavItem 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard size={24} />}
        />
        <MobileNavItem 
          active={activeTab === 'withdraw'} 
          onClick={() => setActiveTab('withdraw')}
          icon={<Wallet size={24} />}
        />
        <MobileNavItem 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')}
          icon={<History size={24} />}
        />
        <button onClick={handleLogout} className="p-2 text-gray-400">
          <LogOut size={24} />
        </button>
      </nav>

      {/* Task Modals */}
      <AnimatePresence>
        {(activeGame || activeSurvey) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl relative"
            >
              {isTaskLoading ? (
                <div className="h-[500px] flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                  <h3 className="text-2xl font-bold text-gray-900">Preparing your {activeGame ? 'Game' : 'Survey'}</h3>
                  <p className="text-gray-500 mt-2">Connecting to secure servers...</p>
                </div>
              ) : (
                <div className="h-[500px] flex flex-col">
                  {/* Modal Header */}
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        {activeGame ? <Gamepad2 size={20} /> : <ClipboardList size={20} />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{activeGame?.title || activeSurvey?.title}</h3>
                        <p className="text-xs text-gray-500">Reward: {activeGame?.pointsReward || activeSurvey?.pointsReward} points</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setActiveGame(null); setActiveSurvey(null); }}
                      className="text-gray-400 hover:text-gray-600 p-2"
                    >
                      <LogOut size={20} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="flex-1 overflow-y-auto p-8">
                    {activeGame && (
                      <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="mb-8">
                          <div className="text-6xl mb-4">🎮</div>
                          <h4 className="text-xl font-bold text-gray-900">Mini-Game Challenge</h4>
                          <p className="text-gray-500 mt-2">Click the button 10 times to complete the level!</p>
                        </div>
                        
                        <div className="w-full max-w-xs bg-gray-100 h-4 rounded-full overflow-hidden mb-8">
                          <motion.div 
                            className="bg-blue-600 h-full"
                            animate={{ width: `${(gameScore / 10) * 100}%` }}
                          />
                        </div>

                        <button 
                          onClick={() => {
                            if (gameScore < 9) setGameScore(prev => prev + 1);
                            else completeGame();
                          }}
                          className="w-32 h-32 bg-blue-600 rounded-full text-white font-bold text-2xl shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all flex flex-col items-center justify-center"
                        >
                          <span>CLICK!</span>
                          <span className="text-sm opacity-70">{gameScore}/10</span>
                        </button>
                      </div>
                    )}

                    {activeSurvey && (
                      <div className="h-full flex flex-col">
                        <div className="mb-8">
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Question {surveyStep + 1} of 3</span>
                            <span className="text-xs text-gray-400">{Math.round(((surveyStep + 1) / 3) * 100)}% Complete</span>
                          </div>
                          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <motion.div 
                              className="bg-blue-600 h-full"
                              animate={{ width: `${((surveyStep + 1) / 3) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex-1">
                          {surveyStep === 0 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                              <h4 className="text-xl font-bold text-gray-900 mb-6">How often do you use mobile apps for earning rewards?</h4>
                              <div className="space-y-3">
                                {['Daily', 'Weekly', 'Monthly', 'Rarely'].map((opt) => (
                                  <button 
                                    key={opt}
                                    onClick={() => setSurveyStep(1)}
                                    className="w-full p-4 text-left border border-gray-200 rounded-2xl hover:border-blue-600 hover:bg-blue-50 transition-all font-medium text-gray-700"
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                          {surveyStep === 1 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                              <h4 className="text-xl font-bold text-gray-900 mb-6">What is your favorite way to earn points?</h4>
                              <div className="space-y-3">
                                {['Watching Videos', 'Playing Games', 'Taking Surveys', 'Referring Friends'].map((opt) => (
                                  <button 
                                    key={opt}
                                    onClick={() => setSurveyStep(2)}
                                    className="w-full p-4 text-left border border-gray-200 rounded-2xl hover:border-blue-600 hover:bg-blue-50 transition-all font-medium text-gray-700"
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                          {surveyStep === 2 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                              <h4 className="text-xl font-bold text-gray-900 mb-6">Would you recommend this app to your friends?</h4>
                              <div className="space-y-3">
                                {['Definitely', 'Probably', 'Maybe', 'No'].map((opt) => (
                                  <button 
                                    key={opt}
                                    onClick={completeSurvey}
                                    className="w-full p-4 text-left border border-gray-200 rounded-2xl hover:border-blue-600 hover:bg-blue-50 transition-all font-medium text-gray-700"
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {watchingVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-4xl">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden relative shadow-2xl">
                <video 
                  src={watchingVideo.videoUrl} 
                  className="w-full h-full object-contain"
                  autoPlay
                  onEnded={completeWatch}
                />
                
                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/20">
                  <motion.div 
                    className="h-full bg-green-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${watchProgress}%` }}
                  />
                </div>

                <button 
                  onClick={() => setWatchingVideo(null)}
                  className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white backdrop-blur-md transition-all"
                >
                  <LogOut size={20} className="rotate-180" />
                </button>
              </div>
              
              <div className="mt-6 text-white">
                <h3 className="text-xl font-bold mb-2">{watchingVideo.title}</h3>
                <div className="flex items-center gap-4 text-white/60 text-sm">
                  <span className="flex items-center gap-1">
                    <Play size={14} /> {watchingVideo.duration}
                  </span>
                  <span className="flex items-center gap-1 text-green-400 font-bold">
                    <Coins size={14} /> +{watchingVideo.pointsReward} Points
                  </span>
                </div>
                
                {watchProgress < 100 ? (
                  <p className="mt-4 text-center text-white/40 italic animate-pulse">
                    Watch until the end to earn points...
                  </p>
                ) : (
                  <button 
                    onClick={completeWatch}
                    className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-900/20"
                  >
                    Claim Your Points!
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-medium",
        active 
          ? "bg-green-50 text-green-700 shadow-sm" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      {icon}
      <span>{label}</span>
      {active && <ChevronRight size={16} className="ml-auto" />}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 rounded-xl transition-all",
        active ? "text-green-600 bg-green-50" : "text-gray-400"
      )}
    >
      {icon}
    </button>
  );
}

interface VideoCardProps {
  video: Video;
  onWatch: () => void;
}

function VideoCard({ video, onWatch }: VideoCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="relative aspect-video">
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100 duration-300">
            <Play size={24} fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded">
          {video.duration}
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-bold text-gray-900 mb-2 line-clamp-1">{video.title}</h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
            <Coins size={14} className="fill-current" />
            <span>+{video.pointsReward} Pts</span>
          </div>
          <button 
            onClick={onWatch}
            className="text-xs font-bold text-green-600 hover:text-green-700 flex items-center gap-1"
          >
            Watch Now <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, subValue, icon }: { label: string, value: string, subValue: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-xs text-gray-400">{subValue}</p>
    </div>
  );
}
