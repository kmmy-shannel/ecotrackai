import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import authService from '../services/auth.service';
import { 
  Award,
  Star,
  TrendingUp,
  History,
  Eye,
  ChevronRight,
  Map,
  Brain,
  CheckCircle,
  Target,
  Zap
} from 'lucide-react';

const EcoScorePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      navigate('/');
      return;
    }
    setUser(currentUser);
  }, [navigate]);

  if (!user) return null;

  // Sample data for eco score
  const ecoScore = {
    points: 50,
    level: 1,
    levelName: "Newcomer",
    description: "Just starting",
    nextLevelPoints: 499,
    progress: 50,
    maxProgress: 499
  };

  // Sample data for earned points
  const earnedPoints = [
    { action: "Use AI route suggestions", points: 50, date: "2024-01-15" },
    { action: "Follow spoilage AI tips", points: 30, date: "2024-01-14" },
    { action: "Successfully deliver using AI route", points: 20, date: "2024-01-13" }
  ];

  // Trust levels data
  const trustLevels = [
    { level: 1, name: "Newcomer", range: "0-499pts", description: "Just Starting", color: "gray" },
    { level: 2, name: "Beginner", range: "500-999pts", description: "Learning & improving", color: "blue" },
    { level: 3, name: "Active Improver", range: "1000-1999pts", description: "Consistently working on it", color: "green" },
    { level: 4, name: "Trusted Partner", range: "2000-3999pts", description: "Reliable & proven", color: "purple" },
    { level: 5, name: "Eco Leader", range: "4000+pts", description: "Sustainability expert", color: "gold" }
  ];

  // Calculate progress percentage
  const progressPercentage = (ecoScore.progress / ecoScore.maxProgress) * 100;

  return (
    <Layout currentPage="EcoScore" user={user}>
      {/* Page Header */}
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Score Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            {/* Score Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-200">
              <h2 className="text-center font-bold text-gray-800 text-lg">Your EcoTrust Score</h2>
            </div>

            {/* Main Score Value */}
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 px-8 py-8">
              <div className="text-center">
                <p className="text-7xl font-bold text-gray-800 mb-3">
                  {ecoScore.points}
                  <span className="text-4xl ml-2">POINTS</span>
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Award size={24} className="text-green-600" />
                  <p className="text-xl text-green-700 font-semibold">
                    LEVEL {ecoScore.level} - {ecoScore.levelName}
                  </p>
                </div>
                <p className="text-green-600 text-sm mt-1">"{ecoScore.description}"</p>
              </div>
            </div>

            {/* Progress Section */}
            <div className="px-6 py-6 bg-white">
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Progress Card */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={18} className="text-green-600" />
                    <p className="text-sm font-semibold text-gray-700">Progress</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-800 mb-1">
                    {ecoScore.progress} / {ecoScore.maxProgress}
                  </p>
                  <p className="text-xs text-gray-500">points earned this level</p>
                </div>

                {/* Next Level Card */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={18} className="text-blue-600" />
                    <p className="text-sm font-semibold text-gray-700">Next</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-800 mb-1">
                    Level {ecoScore.level + 1}
                  </p>
                  <p className="text-xs text-gray-500">at {ecoScore.nextLevelPoints} points</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-600 mb-2">
                  <span>Level {ecoScore.level}</span>
                  <span>Level {ecoScore.level + 1}</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Earned Points By Section */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Zap size={18} className="text-yellow-500" />
                  Earned Points By:
                </h3>
                
                <div className="space-y-3">
                  {earnedPoints.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle size={16} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.action}</p>
                          <p className="text-xs text-gray-500">{item.date}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-600">+{item.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg transition-colors shadow-sm font-medium">
                  <Eye size={16} />
                  How Customer See You
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg transition-colors shadow-sm font-medium">
                  <History size={16} />
                  Point History
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Trust Levels */}
        <div className="space-y-6">
          {/* Trust Levels Card */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-200">
              <h3 className="font-bold text-gray-800 text-lg text-center">Trust Levels</h3>
            </div>

            <div className="divide-y divide-gray-100">
              {trustLevels.map((level) => (
                <div key={level.level} className={`p-4 hover:bg-gray-50 transition-colors ${
                  level.level === ecoScore.level ? 'bg-green-50' : ''
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      level.level === 1 ? 'bg-gray-100' :
                      level.level === 2 ? 'bg-blue-100' :
                      level.level === 3 ? 'bg-green-100' :
                      level.level === 4 ? 'bg-purple-100' :
                      'bg-yellow-100'
                    }`}>
                      <Award size={16} className={
                        level.level === 1 ? 'text-gray-600' :
                        level.level === 2 ? 'text-blue-600' :
                        level.level === 3 ? 'text-green-600' :
                        level.level === 4 ? 'text-purple-600' :
                        'text-yellow-600'
                      } />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-800 text-sm">
                          LEVEL {level.level}: {level.name}
                        </h4>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                          {level.range}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">"{level.description}"</p>
                      
                      {level.level === ecoScore.level && (
                        <div className="mt-2 flex items-center gap-1">
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                            Current Level
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips to Earn More Points */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
              <h3 className="font-bold text-gray-800 text-center">Tips to Earn More Points</h3>
            </div>
            
            <div className="p-5 space-y-4">
              <TipCard
                icon={<Brain size={18} />}
                tip="Use AI route optimization"
                points="+50 pts per route"
              />
              <TipCard
                icon={<Map size={18} />}
                tip="Complete deliveries using AI suggestions"
                points="+20 pts per delivery"
              />
              <TipCard
                icon={<CheckCircle size={18} />}
                tip="Follow spoilage prevention tips"
                points="+30 pts per tip"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Tip Card Component
const TipCard = ({ icon, tip, points }) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl hover:shadow-md transition-all">
      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800">{tip}</p>
        <p className="text-xs text-yellow-700 font-medium">{points}</p>
      </div>
    </div>
  );
};

export default EcoScorePage;