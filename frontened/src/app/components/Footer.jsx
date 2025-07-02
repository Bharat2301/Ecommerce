"use client";

import {
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-[#212121] text-gray-300 px-6 py-10">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        {/* About Section */}
        <div>
          <h3 className="text-white font-semibold mb-3">ABOUT</h3>
          <ul className="space-y-2">
            <li><a href="#" className="hover:underline">Contact Us</a></li>
            <li><a href="#" className="hover:underline">About Us</a></li>
            <li><a href="#" className="hover:underline">Careers</a></li>
            <li><a href="#" className="hover:underline">Stories</a></li>
            <li><a href="#" className="hover:underline">Press</a></li>
          </ul>
        </div>

        {/* Help Section */}
        <div>
          <h3 className="text-white font-semibold mb-3">HELP</h3>
          <ul className="space-y-2">
            <li><a href="#" className="hover:underline">Payments</a></li>
            <li><a href="#" className="hover:underline">Shipping</a></li>
            <li><a href="#" className="hover:underline">Returns</a></li>
            <li><a href="#" className="hover:underline">FAQ</a></li>
          </ul>
        </div>

        {/* Consumer Policy */}
        <div>
          <h3 className="text-white font-semibold mb-3">CONSUMER POLICY</h3>
          <ul className="space-y-2">
            <li><a href="#" className="hover:underline">Cancellation & Returns</a></li>
            <li><a href="#" className="hover:underline">Privacy</a></li>
            <li><a href="#" className="hover:underline">Terms Of Use</a></li>
            <li><a href="#" className="hover:underline">Security</a></li>
            <li><a href="#" className="hover:underline">Grievance Redressal</a></li>
          </ul>
        </div>

        {/* Address and Social */}
        <div>
          <h3 className="text-white font-semibold mb-3">MAIL US:</h3>
          <p className="text-gray-400 mb-4">
            Clothing Store Pvt. Ltd., Street 21, Fashion Road, New Delhi, India - 110001
          </p>
          <h3 className="text-white font-semibold mb-2">Social</h3>
          <div className="flex space-x-4">
            <a
              href="https://www.facebook.com/login"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaFacebookF className="hover:text-white" />
            </a>
            <a
              href="https://twitter.com/login"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaTwitter className="hover:text-white" />
            </a>
            <a
              href="https://www.youtube.com/account"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaYoutube className="hover:text-white" />
            </a>
            <a
              href="https://www.instagram.com/accounts/login/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaInstagram className="hover:text-white" />
            </a>
          </div>
        </div>
      </div>

      <div className="text-center text-xs mt-10 border-t border-gray-600 pt-4 text-gray-500">
        &copy; {new Date().getFullYear()} Clothing Store. All rights reserved.
      </div>
    </footer>
  );
}